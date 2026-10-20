import styles from "./History.module.css";
import { useHistory } from "../useHistory.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Notice } from "../../../ui/Notice.tsx";
import { HistoryEntryItem } from "./HistoryEntryItem.tsx";
import { StateBlock } from "../../../ui/StateBlock.tsx";

interface HistoryScreenProps {
  readonly project: string;
  readonly onCompose: () => void;
}

export function HistoryScreen({ project, onCompose }: HistoryScreenProps) {
  const { entries, error, loading, reload, checks, checkReceipts } = useHistory(project);

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h2 className={styles.headline}>
          What went <em>out</em>.
        </h2>
        <Button variant="secondary" onClick={reload} loading={loading && entries !== null}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Notice tone="error" title="Couldn't load history">
          {error.message}
        </Notice>
      ) : null}

      {!entries && loading ? <StateBlock title="Opening the ledger" loading /> : null}

      {entries && entries.length === 0 ? (
        <StateBlock
          title="Nothing sent yet"
          body="Every send is logged here with its ticket and receipt results. Start with a test to your own phone."
          action={
            <Button variant="primary" onClick={onCompose}>
              Compose a test
            </Button>
          }
        />
      ) : null}

      {entries && entries.length > 0 ? (
        <ol className={styles.ledger} aria-label="Past sends, newest first">
          {entries.map((entry) => (
            <HistoryEntryItem key={entry.id} entry={entry} check={checks[entry.id]} onCheckReceipts={checkReceipts} />
          ))}
        </ol>
      ) : null}
    </main>
  );
}
