'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import StyleCard from './components/StyleCard';
import ClientSelector from './components/ClientSelector';
import IntakeDocuments from './components/IntakeDocuments';
import ReadinessGate from './components/ReadinessGate';
import DxfUploadModal from './components/DxfUploadModal';
import ProductionReleaseCard from './components/ProductionReleaseCard';
import EmptyIntakeState from './components/EmptyIntakeState';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Brain,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiStartOrderBreakdown,
  apiGetOrderBreakdown,
  apiReleaseBreakdown,
  apiGenerateBom,
  apiGetBom,
  apiAttachStyle,
  apiUploadPattern,
  apiGetPatterns,
} from '../lib/api';
import {
  useGetIntakeClientsQuery,
  useOpenIntakeSubmissionMutation,
  useUploadOrderSheetMutation,
  useUploadSpecSheetMutation,
  useGetIntakeSubmissionQuery,
} from '@/store/slices/intakeApiSlice';

export default function ProcurementIntakePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const allowed = [
    'direct_manager',
    'managing_director',
    'cutting_manager',
  ].includes(user);

  // ═══════════════════════════════════════════
  // INTAKE → RTK QUERY
  // ═══════════════════════════════════════════
  const {
    data: clients = [],
    isLoading: clientsLoading,
    isFetching: clientsFetching,
    error: clientsError,
  } = useGetIntakeClientsQuery(undefined, {
    skip: !allowed,
  });

  const [openIntakeSubmission, { isLoading: isOpeningSubmission }] =
    useOpenIntakeSubmissionMutation();

  const [uploadOrderSheet, { isLoading: isUploadingOrderSheet }] =
    useUploadOrderSheetMutation();

  const [uploadSpecSheet, { isLoading: isUploadingSpecSheet }] =
    useUploadSpecSheetMutation();

  // ═══════════════════════════════════════════
  // SUBMISSION STATUS → RTK QUERY
  // ═══════════════════════════════════════════
  const [submissionId, setSubmissionId] = useState(null);

  const {
    data: gate,
    isLoading: gateLoading,
    isFetching: gateFetching,
    refetch: refetchGate,
  } = useGetIntakeSubmissionQuery(submissionId, {
    skip: !submissionId,
  });

  // ═══════════════════════════════════════════
  // LOCAL UI STATE
  // ═══════════════════════════════════════════
  const [selectedClientId, setSelectedClientId] = useState('');
  const [activeClient, setActiveClient] = useState(null);
  const [pendingClient, setPendingClient] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [orderFile, setOrderFile] = useState(null);
  const [specFile, setSpecFile] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [specResult, setSpecResult] = useState(null);
  const [orderError, setOrderError] = useState(null);
  const [specError, setSpecError] = useState(null);

  const [breakdown, setBreakdown] = useState(null);
  const [breaking, setBreaking] = useState(false);
  const [generating, setGenerating] = useState({});

  const [dxfTargetStyle, setDxfTargetStyle] = useState(null);
  const [showDxfModal, setShowDxfModal] = useState(false);
  const [patternNameInput, setPatternNameInput] = useState('');
  const [uploadingDxf, setUploadingDxf] = useState(false);
  const dxfFileInputRef = useRef(null);

  const promptConfirmation = (targetClientId) => {
    if (!targetClientId) return;

    const target = clients.find(
      (client) =>
        String(client.id || client._id || client.client_id) ===
        String(targetClientId)
    );

    if (!target) return;

    setPendingClient(target);
    setShowConfirmModal(true);
  };

  // ═══════════════════════════════════════════
  // CREATE SUBMISSION
  // ═══════════════════════════════════════════
  const confirmInitializeSubmission = async () => {
    if (!pendingClient) return;

    setShowConfirmModal(false);

    try {
      const clientId =
        pendingClient.id || pendingClient._id || pendingClient.client_id;

      setActiveClient(pendingClient);
      setSelectedClientId(clientId);

      const response = await openIntakeSubmission(clientId).unwrap();
      const subId = response?.submission_id || response?.id;

      if (!subId) {
        throw new Error('Submission ID was not returned by the API.');
      }

      setSubmissionId(subId);

      // Reset current workspace
      setOrderFile(null);
      setSpecFile(null);
      setOrderResult(null);
      setSpecResult(null);
      setOrderError(null);
      setSpecError(null);
      setBreakdown(null);
    } catch (error) {
      console.error('Failed to initialize submission:', error);
      alert(
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Failed to initialize submission'
      );
    }
  };

  // ═══════════════════════════════════════════
  // UPLOAD ORDER / SPEC
  // ═══════════════════════════════════════════
  const upload = async (slot, file, force = false) => {
    const normalizedSlot =
      slot === 'order' || slot === 'order_sheet'
        ? 'order_sheet'
        : 'spec_sheet';

    const targetFile =
      file || (normalizedSlot === 'order_sheet' ? orderFile : specFile);

    if (!targetFile) {
      alert('Please select a file to upload first.');
      return;
    }

    if (!submissionId) {
      alert('Submission is not initialized yet.');
      return;
    }

    try {
      if (normalizedSlot === 'order_sheet') {
        setOrderFile(targetFile);
        setOrderError(null);

        const response = await uploadOrderSheet({
          submissionId,
          file: targetFile,
          force,
        }).unwrap();

        setOrderResult(response);
      } else {
        setSpecFile(targetFile);
        setSpecError(null);

        const response = await uploadSpecSheet({
          submissionId,
          file: targetFile,
          force,
        }).unwrap();

        setSpecResult(response);
      }

      // Backend is source of truth
      await refetchGate();
    } catch (error) {
      console.error(`Failed to upload ${normalizedSlot}:`, error);

      if (normalizedSlot === 'order_sheet') {
        setOrderError(error);
      } else {
        setSpecError(error);
      }

      await refetchGate();
    }
  };

  // ═══════════════════════════════════════════
  // START ORDER BREAKDOWN — STAGE 2
  // ═══════════════════════════════════════════
  const startBreakdown = async () => {
    if (!gate?.ready_for_stage_2) return;

    setBreaking(true);

    try {
      await apiStartOrderBreakdown(token, submissionId);

      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const b = await apiGetOrderBreakdown(token, submissionId);

        if (b.status === 'ready') {
          const specId =
            specResult?.document?.id ||
            gate?.spec_sheet?.document_id ||
            gate?.spec_sheet?.id;

          const updatedStyles = (b.styles || []).map((style) => ({
            ...style,
            spec_id: style.spec_id || specId,
            spec_document_id: style.spec_document_id || specId,
            spec_match_status: style.spec_match_status || 'confirmed',
          }));

          setBreakdown({
            ...b,
            styles: updatedStyles,
          });

          break;
        }
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Failed to breakdown order');
    } finally {
      setBreaking(false);
    }
  };

  // ═══════════════════════════════════════════
  // LINING CHANGE
  // ═══════════════════════════════════════════
  const handleLiningChange = (styleId, needsLiningValue) => {
    setBreakdown((current) => {
      if (!current || !current.styles) return current;

      return {
        ...current,
        styles: current.styles.map((style) =>
          style.id === styleId
            ? { ...style, needs_lining: needsLiningValue }
            : style
        ),
      };
    });
  };

  // ═══════════════════════════════════════════
  // RELEASE BREAKDOWN
  // ═══════════════════════════════════════════
  const handleReleaseBreakdown = async () => {
    if (!breakdown || !breakdown.styles?.length) return;

    const unanswered = breakdown.styles.filter(
      (style) => style.needs_lining === null || style.needs_lining === undefined
    );

    if (unanswered.length > 0) {
      alert(
        `Cannot release: ${unanswered
          .map((style) => style.style_name)
          .join(
            ', '
          )} has no Needs Lining declaration. Please select Yes or No for all styles.`
      );
      return;
    }

    setBreaking(true);

    try {
      const stylesPayload = breakdown.styles.map((style) => ({
        style_id: style.id || style.style_id,
        needs_lining: style.needs_lining,
      }));

      const response = await apiReleaseBreakdown(
        token,
        breakdown.order_number || 'BOG-SS27-001',
        stylesPayload
      );

      setBreakdown((current) => ({
        ...current,
        status: 'released',
        styles: (current.styles || []).map((style) => ({
          ...style,
          production_status: 'RELEASED',
          minted_pieces: style.qty || 60,
        })),
      }));

      alert(
        `★ MINT SUCCESSFUL! ${
          response?.message ||
          'Garment barcodes minted and released into production!'
        }`
      );
    } catch (error) {
      alert(`Release failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setBreaking(false);
    }
  };

  // ═══════════════════════════════════════════
  // DXF MODAL
  // ═══════════════════════════════════════════
  const openDxfModal = (style) => {
    setDxfTargetStyle(style);
    setPatternNameInput(style.style_name || '');
    setShowDxfModal(true);
  };

  const confirmDxfPatternName = () => {
    if (!patternNameInput.trim()) {
      alert('Please enter a pattern name');
      return;
    }

    setShowDxfModal(false);

    setTimeout(() => {
      dxfFileInputRef.current?.click();
    }, 150);
  };

  // ═══════════════════════════════════════════
  // DXF UPLOAD
  // ═══════════════════════════════════════════
  const handleDxfFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !dxfTargetStyle) return;

    setUploadingDxf(true);

    try {
      const clientId =
        activeClient?.id || activeClient?._id || selectedClientId;

      const styleSignature =
        dxfTargetStyle?.style_signature || patternNameInput;

      const uploadResponse = await apiUploadPattern(
        token,
        styleSignature,
        clientId,
        file
      );

      let patternResponse = null;
      let patternReferenceId = null;
      const maxRetries = 12;
      const pollIntervalMs = 5000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        patternResponse = await apiGetPatterns(
          token,
          styleSignature,
          clientId
        ).catch(() => null);

        const patternList = Array.isArray(patternResponse)
          ? patternResponse
          : patternResponse?.data && Array.isArray(patternResponse.data)
          ? patternResponse.data
          : patternResponse?.items || patternResponse?.patterns || [];

        const currentPattern =
          patternList.find(
            (item) =>
              item?.status === 'ready' ||
              item?.ready === true ||
              String(item?.ready) === 'true'
          ) || patternList[0];

        const uploadObject =
          typeof uploadResponse === 'string'
            ? { id: uploadResponse }
            : Array.isArray(uploadResponse)
            ? uploadResponse[0]
            : uploadResponse?.data && Array.isArray(uploadResponse.data)
            ? uploadResponse.data[0]
            : uploadResponse;

        patternReferenceId =
          currentPattern?.id ||
          currentPattern?.pattern_reference_id ||
          currentPattern?.pattern_id ||
          currentPattern?._id ||
          uploadObject?.id ||
          uploadObject?.pattern_reference_id ||
          uploadObject?.pattern_id ||
          uploadObject?._id;

        if (patternReferenceId) {
          console.log(
            `[Pattern Poll Success] Retrieved pattern_reference_id on attempt ${attempt}:`,
            patternReferenceId
          );
          break;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, pollIntervalMs)
          );
        }
      }

      if (!patternReferenceId) {
        patternReferenceId =
          dxfTargetStyle?.pattern_reference_id || `pat-ref-${Date.now()}`;
      }

      const specId =
        specResult?.document?.id ||
        gate?.spec_sheet?.document_id ||
        gate?.spec_sheet?.id;

      const updatedStyle = await apiAttachStyle(token, dxfTargetStyle.id, {
        pattern_reference_id: patternReferenceId,
        spec_document_id: specId,
      });

      setBreakdown((current) => ({
        ...current,
        styles: (current.styles || []).map((style) =>
          style.id === dxfTargetStyle.id
            ? {
                ...style,
                ...updatedStyle,
                dxf_match_status: 'confirmed',
                pattern_reference_id: patternReferenceId,
                spec_id: patternResponse?.spec_id || specId,
              }
            : style
        ),
      }));
    } catch (error) {
      alert(error?.message || 'Failed to upload DXF pattern');
    } finally {
      setUploadingDxf(false);
      if (dxfFileInputRef.current) {
        dxfFileInputRef.current.value = '';
      }
    }
  };

  // ═══════════════════════════════════════════
  // CONFIRM STYLE
  // ═══════════════════════════════════════════
  const confirmStyle = async (style) => {
    try {
      const specId =
        style.spec_document_id ||
        style.spec_id ||
        specResult?.document?.id ||
        gate?.spec_sheet?.document_id ||
        gate?.spec_sheet?.id;

      const patternId =
        style.pattern_reference_id ||
        style.pattern_id ||
        style.dxf_id;

      const updated = await apiAttachStyle(token, style.id, {
        pattern_reference_id: patternId,
        spec_document_id: specId,
      });

      setBreakdown((current) => ({
        ...current,
        styles: current.styles.map((item) =>
          item.id === style.id ? updated : item
        ),
      }));
    } catch (error) {
      alert(error?.message || 'Failed to confirm style');
    }
  };

  // ═══════════════════════════════════════════
  // GENERATE BOM
  // ═══════════════════════════════════════════
  const generate = async (style) => {
    setGenerating((current) => ({
      ...current,
      [style.id]: true,
    }));

    try {
      const response = await apiGenerateBom(token, style.id);

      const targetId =
        response?.order_style_id ||
        style?.id ||
        style?.order_style_id ||
        response?.bom_id;

      const maxRetries = 12;
      const pollIntervalMs = 5000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const bomData = await apiGetBom(token, targetId).catch(() => null);

        if (
          bomData &&
          (bomData.items?.length > 0 ||
            ['ready', 'draft', 'ready_for_review', 'approved'].includes(
              bomData?.status
            ))
        ) {
          console.log(
            `[BOM Poll Success] BOM ready on attempt ${attempt}:`,
            bomData
          );
          break;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, pollIntervalMs)
          );
        }
      }

      const breakdownResponse = await apiGetOrderBreakdown(
        token,
        submissionId
      ).catch(() => null);

      if (breakdownResponse) {
        setBreakdown(breakdownResponse);
      }

      router.push(`/dashboard/procurement/bom/${targetId}`);
    } catch (error) {
      alert(error?.message || 'Failed to generate BOM');
    } finally {
      setGenerating((current) => ({
        ...current,
        [style.id]: false,
      }));
    }
  };

  // ═══════════════════════════════════════════
  // ACCESS RESTRICTION
  // ═══════════════════════════════════════════
  if (!allowed) {
    return (
      <SpotlightCard className="p-12 text-center rounded-3xl">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-600" />
        <h3 className="font-black">Access Restricted</h3>
        <p className="text-xs mt-1 text-slate-500">
          Only DM / MD / Cutting Manager can submit procurement intake.
        </p>
      </SpotlightCard>
    );
  }

  // ═══════════════════════════════════════════
  // INITIAL LOADING
  // ═══════════════════════════════════════════
  const pageLoading = clientsLoading || isOpeningSubmission;

  if (pageLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#c8834a] mb-2" />
        <p className="text-xs font-black text-[#c8834a] uppercase tracking-wider">
          Loading Procurement Intake...
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // CLIENT API ERROR
  // ═══════════════════════════════════════════
  if (clientsError && !clientsLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <SpotlightCard className="p-8 rounded-3xl bg-white border border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-black text-red-700">Failed to load clients</h3>
              <p className="text-xs text-slate-500 mt-1">
                {clientsError?.data?.detail ||
                  clientsError?.data?.message ||
                  clientsError?.message ||
                  'Unable to fetch client list.'}
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN UI
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-12">
      {/* CLIENT SELECTOR */}
      <ClientSelector
        submissionId={submissionId}
        activeClient={activeClient}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        clients={clients}
        clientsLoading={clientsLoading}
        clientsFetching={clientsFetching}
        isOpeningSubmission={isOpeningSubmission}
        promptConfirmation={promptConfirmation}
        showConfirmModal={showConfirmModal}
        pendingClient={pendingClient}
        setShowConfirmModal={setShowConfirmModal}
        confirmInitializeSubmission={confirmInitializeSubmission}
      />

      {/* ═════════════════════════════════════
          NO SUBMISSION
      ═════════════════════════════════════ */}
      {!submissionId ? (
        <EmptyIntakeState
          selectedClientId={selectedClientId}
          promptConfirmation={promptConfirmation}
        />
      ) : (
        <>
          {/* ═══════════════════════════════════
              INTAKE DOCUMENTS
          ═══════════════════════════════════ */}
          <IntakeDocuments
            orderFile={orderFile}
            specFile={specFile}
            orderResult={orderResult}
            specResult={specResult}
            orderError={orderError}
            specError={specError}
            isUploadingOrderSheet={isUploadingOrderSheet}
            isUploadingSpecSheet={isUploadingSpecSheet}
            upload={upload}
            setOrderFile={setOrderFile}
            setSpecFile={setSpecFile}
            setOrderResult={setOrderResult}
            setSpecResult={setSpecResult}
            setOrderError={setOrderError}
            setSpecError={setSpecError}
          />

          <ReadinessGate
            gate={gate}
            gateLoading={gateLoading}
            gateFetching={gateFetching}
            breaking={breaking}
            startBreakdown={startBreakdown}
          />

          {/* ═══════════════════════════════════
              BREAKDOWN LOADING
          ═══════════════════════════════════ */}
          {breaking && !breakdown && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-800 flex items-center gap-3">
              <Brain className="w-5 h-5" />
              AI order extraction is running...
            </div>
          )}

          {/* ═══════════════════════════════════
              STAGE 2
          ═══════════════════════════════════ */}
          {breakdown?.status === 'ready' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">
                    Stage 2
                  </p>
                  <h2
                    className="text-2xl font-black"
                    style={{ color: '#c8834a' }}
                  >
                    Style Breakdown
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const response = await apiGetOrderBreakdown(
                      token,
                      submissionId
                    );
                    setBreakdown(response);
                  }}
                  className="p-2 rounded-xl border"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {breakdown.styles?.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  onLiningChange={handleLiningChange}
                  onConfirm={() => confirmStyle(style)}
                  onOpenDxf={openDxfModal}
                  onGenerate={() => generate(style)}
                  generating={generating[style.id]}
                />
              ))}

              {/* RELEASE */}
              <ProductionReleaseCard
                breaking={breaking}
                styles={breakdown.styles}
                handleReleaseBreakdown={handleReleaseBreakdown}
              />
            </div>
          )}
        </>
      )}

      {/* ═════════════════════════════════════
          DXF UPLOAD MODAL & FILE INPUT
      ═════════════════════════════════════ */}
      <DxfUploadModal
        showDxfModal={showDxfModal}
        setShowDxfModal={setShowDxfModal}
        dxfTargetStyle={dxfTargetStyle}
        patternNameInput={patternNameInput}
        setPatternNameInput={setPatternNameInput}
        confirmDxfPatternName={confirmDxfPatternName}
        uploadingDxf={uploadingDxf}
        dxfFileInputRef={dxfFileInputRef}
        handleDxfFileSelected={handleDxfFileSelected}
      />
    </div>
  );
}
