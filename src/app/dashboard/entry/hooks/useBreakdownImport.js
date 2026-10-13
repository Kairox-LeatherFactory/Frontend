'use client';
import { useState, useRef } from "react";
import { apiImportPreview, apiImportCommit } from "@/lib/api";

export function useBreakdownImport({ token }) {
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [showCommitConfirmation, setShowCommitConfirmation] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [pendingBreakdownOrder, setPendingBreakdownOrder] = useState(null);
  const [showOrderNumModal, setShowOrderNumModal] = useState(false);
  const [uploadOrderNumber, setUploadOrderNumber] = useState("");
  const [uploadOrderNumberError, setUploadOrderNumberError] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadOrderNumber) {
      setUploadOrderNumberError("Please enter an Order Number first");
      return;
    }
    setUploadLoading(true);
    setUploadError("");
    try {
      const data = await apiImportPreview(token, file, uploadOrderNumber);
      setPreviewData(data);
      setFileName(file.name);
      setShowPreviewModal(true);
      setShowOrderNumModal(false);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCommit = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) return;
    setCommitLoading(true);
    try {
      const result = await apiImportCommit(token, file, uploadOrderNumber);
      setShowPreviewModal(false);
      if (result?.written?.release_required ?? result?.release_required) {
        const orderNumber = uploadOrderNumber;
        setUploadOrderNumber("");
        setCommitResult(result?.written ?? result);
        setPendingBreakdownOrder(orderNumber);
        setShowCommitConfirmation(true);
        return;
      }
      setCommitSuccess("File imported and database updated successfully!");
      setUploadOrderNumber("");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setCommitLoading(false);
    }
  };

  return {
    fileInputRef,
    uploadLoading,
    showPreviewModal,
    setShowPreviewModal,
    previewData,
    fileName,
    commitLoading,
    commitSuccess,
    setCommitSuccess,
    uploadError,
    setUploadError,
    showCommitConfirmation,
    setShowCommitConfirmation,
    commitResult,
    setCommitResult,
    pendingBreakdownOrder,
    setPendingBreakdownOrder,
    showOrderNumModal,
    setShowOrderNumModal,
    uploadOrderNumber,
    setUploadOrderNumber,
    uploadOrderNumberError,
    setUploadOrderNumberError,
    handleFileUpload,
    handleCommit,
  };
}
