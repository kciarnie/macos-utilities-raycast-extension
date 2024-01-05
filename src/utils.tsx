import { execSync } from "child_process";
import { shellHistory, shellHistoryPath } from "shell-history";

export const backupLocation = "/tmp/terminal-history-backup.file.txt";

/// Get the shell history
/// - Returns: An array of commands
export function getHistory() {
  return shellHistory() || [];
}

/// Restore the history file from a backup location
export function restoreHistory() {
  console.log(`cp ${backupLocation} ~/.zsh_history`);
  execSync(`cp ${backupLocation} ~/.zsh_history`);
  // getHistory();
}

/// Save the history file to a backup location
export function saveFile() {
  const path = shellHistoryPath() ?? "";
  console.log(`cp ${path} ${backupLocation}`);
  execSync(`cp ${path} ${backupLocation}`);
}
/// Create a ray.so link
/// - Parameter command: The command to encode
/// - Returns: A ray.so link
export function createRaySoLink(command: string): string {
  try {
    // eslint-disable-next-line no-undef
    const decodedString = btoa(command);
    return `https://ray.so/#language=shell&code=${decodedString}`;
  } catch (error) {
    console.log(`Error parsing: ${command}`);
    return "";
  }
}
