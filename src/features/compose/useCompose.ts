import { useAudienceCount } from "./useAudienceCount.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardApi, isAbortError } from "../../api/dashboardApi.ts";
import type { FieldErrors } from "../../../shared/compose.ts";
import type { ReceiptsResponse, SendResponse } from "../../../shared/contract.ts";
import {
  EMPTY_DRAFT,
  buildPreview,
  payloadSize,
  toSendRequest,
  toTarget,
  validateDraft,
  type ComposeDraft,
} from "./service/composeDraft.ts";

const AUTO_RECEIPT_DELAY_MS = 15_000;

export type SendPhase = "idle" | "confirming" | "sending";

export interface ReceiptState {
  readonly loading: boolean;
  readonly result: ReceiptsResponse | null;
  readonly error: string | null;
}

const IDLE_RECEIPTS: ReceiptState = { loading: false, result: null, error: null };

export function useCompose(project: string, prefillToken: string | null) {
  const [draft, setDraft] = useState<ComposeDraft>(EMPTY_DRAFT);
  const [showErrors, setShowErrors] = useState(false);
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [result, setResult] = useState<SendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptState>(IDLE_RECEIPTS);
  const [audienceVersion, setAudienceVersion] = useState(0);
  const receiptTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (receiptTimer.current) window.clearTimeout(receiptTimer.current);
    };
  }, []);

  useEffect(() => {
    if (prefillToken) setDraft((current) => ({ ...current, audience: "token", token: prefillToken }));
  }, [prefillToken]);

  const previousProject = useRef(project);
  useEffect(() => {
    if (previousProject.current === project) return;
    previousProject.current = project;
    if (receiptTimer.current) window.clearTimeout(receiptTimer.current);
    setPhase((current) => (current === "confirming" ? "idle" : current));
    setDraft((current) => (current.audience === "token" ? { ...current, token: "" } : current));
    setResult(null);
    setSendError(null);
    setReceipts(IDLE_RECEIPTS);
  }, [project]);

  const target = useMemo(() => toTarget(draft), [draft]);
  const audience = useAudienceCount(project, target, audienceVersion);
  const errors: FieldErrors = useMemo(() => validateDraft(draft), [draft]);
  const visibleErrors: FieldErrors = showErrors ? errors : { data: errors.data };
  const preview = useMemo(() => buildPreview(draft), [draft]);
  const bytes = useMemo(() => payloadSize(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;

  const update = useCallback((patch: Partial<ComposeDraft>) => setDraft((current) => ({ ...current, ...patch })), []);

  const checkReceipts = useCallback(
    async (logId: string, logProject: string = project) => {
      setReceipts({ loading: true, result: null, error: null });
      try {
        const response = await dashboardApi.receipts(logProject, logId);
        if (mounted.current) setReceipts({ loading: false, result: response, error: null });
      } catch (error) {
        if (isAbortError(error) || !mounted.current) return;
        setReceipts({ loading: false, result: null, error: error instanceof Error ? error.message : String(error) });
      }
    },
    [project]
  );

  const send = async (confirmAll: boolean) => {
    const payload = toSendRequest(draft, confirmAll);
    if (!payload) return;
    const sendProject = project;
    setPhase("sending");
    setSendError(null);
    setResult(null);
    setReceipts(IDLE_RECEIPTS);
    if (receiptTimer.current) window.clearTimeout(receiptTimer.current);
    try {
      const response = await dashboardApi.send(sendProject, payload);
      if (!mounted.current || previousProject.current !== sendProject) return;
      setResult(response);
      setAudienceVersion((current) => current + 1);
      const logId = response.logId;
      if (logId && response.ok > 0) {
        receiptTimer.current = window.setTimeout(() => checkReceipts(logId, sendProject), AUTO_RECEIPT_DELAY_MS);
      }
    } catch (error) {
      if (mounted.current) setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      if (mounted.current) setPhase("idle");
    }
  };

  const requestSend = () => {
    setShowErrors(true);
    if (hasErrors || !target) return;
    if (target.type === "token") {
      void send(false);
      return;
    }
    setPhase("confirming");
  };

  const confirmSend = () => void send(target?.type === "all");
  const cancelSend = () => setPhase((current) => (current === "confirming" ? "idle" : current));
  const reset = () => {
    setDraft((current) => ({ ...EMPTY_DRAFT, audience: current.audience, token: current.token }));
    setShowErrors(false);
    setResult(null);
    setSendError(null);
    setReceipts(IDLE_RECEIPTS);
  };

  return {
    draft,
    update,
    errors: visibleErrors,
    hasErrors,
    preview,
    bytes,
    audience,
    phase,
    result,
    sendError,
    receipts,
    requestSend,
    confirmSend,
    cancelSend,
    checkReceipts,
    reset,
  };
}

export type ComposeController = ReturnType<typeof useCompose>;
