import styles from "./ProgressBar.module.css";

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className={styles.track} aria-hidden="true">
      <i className={styles.fill} style={{ width: percent + "%" }} />
    </div>
  );
}
