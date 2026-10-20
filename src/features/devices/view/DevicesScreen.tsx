import { StatTile } from "./StatTile.tsx";
import styles from "./Devices.module.css";
import { useDevices } from "../useDevices.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Notice } from "../../../ui/Notice.tsx";
import { BreakdownList } from "./BreakdownList.tsx";
import { DeviceTableRow } from "./DeviceTableRow.tsx";
import { StateBlock } from "../../../ui/StateBlock.tsx";

interface DevicesScreenProps {
  readonly project: string;
  readonly onTest: (token: string) => void;
}

export function DevicesScreen({ project, onTest }: DevicesScreenProps) {
  const { data, error, loading, reload, busyId, actionError, disable } = useDevices(project);
  const platformCount = (label: string) => data?.byPlatform.find((item) => item.label === label)?.count ?? 0;

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h2 className={styles.headline}>
          Who's <em>listening</em>.
        </h2>
        <Button variant="secondary" onClick={reload} loading={loading && data !== null}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Notice tone="error" title="Couldn't load devices">
          {error.message}
        </Notice>
      ) : null}
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}

      {!data && loading ? <StateBlock title="Gathering devices" loading /> : null}

      {data ? (
        <>
          <div className={styles.stats}>
            <StatTile label="Enabled devices" value={data.enabled} lead />
            <StatTile label="Android" value={platformCount("Android")} />
            <StatTile label="iOS" value={platformCount("iOS")} />
            <StatTile label="Switched off" value={data.total - data.enabled} />
          </div>

          {data.total === 0 ? (
            <StateBlock
              title="No devices yet"
              body="Install a development build on your phone, turn on notifications in onboarding or Settings, and reopen the app. Its token appears here within seconds."
            />
          ) : (
            <>
              <div className={styles.breakdowns}>
                <BreakdownList title="App version" items={data.byVersion} />
                <BreakdownList title="Language" items={data.byLocale} />
                <BreakdownList title="Platform" items={data.byPlatform} />
              </div>
              <div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className="visually-hidden">Registered devices, most recently seen first</caption>
                    <thead>
                      <tr>
                        <th scope="col">Token</th>
                        <th scope="col">Platform</th>
                        <th scope="col">Version</th>
                        <th scope="col">Language</th>
                        <th scope="col">Time zone</th>
                        <th scope="col">Last seen</th>
                        <th scope="col">Status</th>
                        <th scope="col">
                          <span className="visually-hidden">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.devices.map((device) => (
                        <DeviceTableRow
                          key={device.id}
                          device={device}
                          busy={busyId === device.id}
                          onTest={onTest}
                          onDisable={disable}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.caption}>
                  Showing {data.devices.length} of {data.total} most recently seen
                  {data.truncated ? " (counts capped at 20,000 rows)" : ""}. Switching a device off lasts until the app
                  next opens with notifications on, which re-registers it.
                </p>
              </div>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
