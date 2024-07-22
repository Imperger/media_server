import child from 'child_process';

import dateFormat from 'dateformat';
import type { Plugin } from 'vite';

function version(): string {
  const git = child.spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8'
  });

  return `"${git.stdout.slice(0, -1)}_${dateFormat(Date.now(), 'yyyy-mm-dd_HH:MM:ss')}"`;
}

export default function BuildInfoPlugin(): Plugin {
  return {
    name: 'build-info-plugin',
    config() {
      return {
        define: { 'import.meta.env.VITE_BUILD_VERSION': version() }
      };
    }
  };
}
