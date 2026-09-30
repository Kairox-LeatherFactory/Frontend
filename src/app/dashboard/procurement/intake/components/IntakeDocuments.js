import { FileText, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';

import DropZone from './DropZoneTemp';
import ValidationCard from './ValidationCard';
import SpotlightCard from '@/components/SpotlightCard';

export default function IntakeDocuments({
  orderFile,
  specFile,
  orderResult,
  specResult,
  orderError,
  specError,
  isUploadingOrderSheet,
  isUploadingSpecSheet,
  upload,
  setOrderFile,
  setSpecFile,
  setOrderResult,
  setSpecResult,
  setOrderError,
  setSpecError,
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">

      {/* ORDER SHEET */}
      <SpotlightCard
        className="p-5 rounded-3xl bg-white"
        spotlightColor="rgba(200,131,74,.04)"
        style={{
          border: '1px solid rgba(200,131,74,.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-[#c8834a]" />

          <div>
            <p className="font-black">
              Order Sheet
            </p>

            <p className="text-[10px] text-slate-400">
              Classification + virus/MIME gate
            </p>
          </div>
        </div>

        <DropZone
          label="Order Sheet"
          icon={FileText}
          file={orderFile}
          disabled={isUploadingOrderSheet}
          onFile={(file) =>
            upload('order_sheet', file)
          }
          onClear={() => {
            setOrderFile(null);
            setOrderResult(null);
            setOrderError(null);
          }}
          description="Try ORDER BOGGI SS27.xlsx for heuristic acceptance"
        />

        {isUploadingOrderSheet && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#c8834a]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading Order Sheet...
          </div>
        )}

        <ValidationCard
          title="Order validation"
          data={orderResult}
          error={orderError}
        />
      </SpotlightCard>


      {/* SPEC SHEET */}
      <SpotlightCard
        className="p-5 rounded-3xl bg-white"
        spotlightColor="rgba(200,131,74,.04)"
        style={{
          border: '1px solid rgba(200,131,74,.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#c8834a]" />

          <div>
            <p className="font-black">
              Spec Sheet
            </p>

            <p className="text-[10px] text-slate-400">
              Technical specification validation
            </p>
          </div>
        </div>

        <DropZone
          label="Spec Sheet"
          icon={UploadCloud}
          file={specFile}
          disabled={isUploadingSpecSheet}
          onFile={(file) =>
            upload('spec_sheet', file)
          }
          onClear={() => {
            setSpecFile(null);
            setSpecResult(null);
            setSpecError(null);
          }}
          description="Try SPEC CLERMONT.pdf for heuristic acceptance"
        />

        {isUploadingSpecSheet && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#c8834a]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading Spec Sheet...
          </div>
        )}

        <ValidationCard
          title="Spec validation"
          data={specResult}
          error={specError}
        />
      </SpotlightCard>

    </div>
  );
}