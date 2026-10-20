import styles from "./Devices.module.css";
import { Pill } from "../../../ui/Pill.tsx";
import { Button } from "../../../ui/Button.tsx";
import { formatRelative } from "../../../ui/format.ts";
import { previewToken } from "../../../../shared/compose.ts";
import type { DeviceRow } from "../../../../shared/contract.ts";

interface DeviceTableRowProps {
  readonly device: DeviceRow;
  readonly busy: boolean;
  readonly onTest: (token: string) => void;
  readonly onDisable: (id: string) => void;
}

export function DeviceTableRow({ device, busy, onTest, onDisable }: DeviceTableRowProps) {
  return (
    <tr>
      <td className={styles.token} title={device.token}>
        {previewToken(device.token)}
      </td>
      <td>{device.platform === "ios" ? "iOS" : "Android"}</td>
      <td>{device.appVersion ?? <span className={styles.muted}>—</span>}</td>
      <td>{device.locale ?? <span className={styles.muted}>—</span>}</td>
      <td className={styles.muted}>{device.timezone ?? "—"}</td>
      <td title={new Date(device.lastSeenAt).toLocaleString()}>{formatRelative(device.lastSeenAt)}</td>
      <td>
        {device.enabled ? (
          <Pill tone="success" dot>
            On
          </Pill>
        ) : (
          <Pill tone="neutral">Off · {device.disabledReason ?? "disabled"}</Pill>
        )}
      </td>
      <td>
        <div className={styles.actions}>
          <Button
            variant="quiet"
            onClick={() => onTest(device.token)}
            ariaLabel={`Send a test to ${previewToken(device.token)}`}
          >
            Test
          </Button>
          {device.enabled ? (
            <Button
              variant="danger"
              onClick={() => onDisable(device.id)}
              loading={busy}
              ariaLabel={`Switch off ${previewToken(device.token)}`}
            >
              Switch off
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
