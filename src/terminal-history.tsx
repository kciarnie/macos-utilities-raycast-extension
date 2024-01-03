import { ActionPanel, Action, Icon, Color, List, confirmAlert, Alert, Cache, Detail, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import os from 'os';
import path from "path";
import fs from "fs";

const backupLocation = "/tmp/terminal-history-backup.file.txt";

const cache = new Cache();

export function parseShellHistory(string: string) {
  const reBashHistory = /^: \d+:0;/;

  return string.trim().split('\n').map(line => {
    if (reBashHistory.test(line)) {
      return line.split(';').slice(1).join(';');
    }

    // ZSH just places one command on each line
    return line;
  });
}

export function shellHistoryPath({ extraPaths = [] } = {}) {
  if (process.env.HISTFILE) {
    return process.env.HISTFILE;
  }

  const homeDir = os.homedir();

  const paths = new Set([
    path.join(homeDir, '.bash_history'),
    path.join(homeDir, '.zsh_history'),
    path.join(homeDir, '.history')
  ]);

  for (const path of extraPaths) {
    paths.add(path);
  }

  const filterdHistoryPath = () => {
    let largestFile;
    let size = 0;

    for (const path of paths) {
      if (!fs.existsSync(path)) {
        continue;
      }

      if (fs.statSync(path).size > size) {
        size = fs.statSync(path).size;
        largestFile = path;
      }
    }
    return largestFile;
  };

  return filterdHistoryPath();
}

function setHistory() {
  const historyPath = shellHistoryPath();
  const history = historyPath ? parseShellHistory(fs.readFileSync(historyPath).toString()) : [];
  // Remove duplicates
  return [...new Set(history)].map((command) => `${command}`.trim());
}

var history: string[] = [];

export default function Command() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }
    , [loading]);

  history = setHistory();

  // Reverse the array
  const length = history.length;

  function RestoreHistoryPanel() {
    return (
      <Action
        title="Restore History"
        icon={{ source: Icon.Pencil }}
        onAction={
          () => {
            confirmAlert({
              title: `Would you like to restore your history ? `,
              primaryAction: {
                title: "Restore",
              },
            }).then((confirmed) => {
              if (confirmed) {
                restoreHistory();
                setLoading(true);
              }
            });
          }
        } shortcut={{ modifiers: ["cmd"], key: "r" }} />
    );
  }

  if (length === 0) {
    return <Detail
      markdown={`No History`}
      actions={
        <ActionPanel>
          <RestoreHistoryPanel />
        </ActionPanel>
      }
    />
  }

  return (
    <List isLoading={history.length === 0} searchBarPlaceholder="Filter commands by name...">
      {history.reverse().map((command, index) => (
        <List.Item
          key={index}
          title={`${command}`}
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          accessories={[
            {
              text: {
                value: `${length - index + 1} `,
                color: Color.PrimaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Command"
                content={command}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Ray.so site"
                content={createRaySoLink(command)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Ray.so site"
                url={createRaySoLink(command)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Delete History"
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                style={Action.Style.Destructive}
                onAction={() => {
                  confirmAlert({
                    title: `Are you sure you want to delete your history ? `,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  }).then((confirmed) => {
                    if (confirmed) {
                      saveFile();
                      // Check if path exists for zsh or bash
                      if (os.userInfo().shell === "/bin/zsh") {
                        execSync("rm ~/.zsh_history");
                      } else if (os.userInfo().shell === "/bin/bash") {
                        execSync("rm ~/.bash_history");
                      } else {
                        console.log("Shell not supported");
                        showHUD("Shell not supported");
                        return;
                      }
                      execSync("history -c");
                      setLoading(true);
                    }
                  });
                }}
              />
              <Action
                title="Backup History"
                icon={{ source: Icon.CopyClipboard }}
                onAction={
                  () => {
                    saveFile();
                    setLoading(true);
                  }
                } shortcut={{ modifiers: ["cmd"], key: "b" }} />
              <RestoreHistoryPanel />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/// Restore the history file from a backup location
function restoreHistory() {
  cache.get("largestFile");
  console.log(`cp ${backupLocation} ~/.zsh_history`);
  execSync(`cp ${backupLocation} ~/.zsh_history`);
  setHistory();
}

/// Save the history file to a backup location
function saveFile() {
  const largestFile = shellHistoryPath() ?? "";
  cache.set("largestFile", largestFile);
  console.log(`cp ${largestFile} ${backupLocation}`);
  execSync(`cp ${largestFile} ${backupLocation}`);
}

/// Create a ray.so link
/// - Parameter command: The command to encode
/// - Returns: A ray.so link
function createRaySoLink(command: string): string {
  try {
    // eslint-disable-next-line no-undef
    const decodedString = btoa(command);
    return `https://ray.so/#language=shell&code=${decodedString}&padding=16&title=Terminal+History+Command&darkMode=true&background=true&theme=raindrop`;
  } catch (error) {
    console.log(`Error parsing: ${command}`);
    return "";
  }
}
