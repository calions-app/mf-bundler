import bluebird from "bluebird";
import { ChildProcess } from "child_process";
import { Dirent, existsSync, readdirSync } from "fs";
import { default as path } from "path";

import color from "./color";

export interface ComponentProcess {
  name: string;
  process: ChildProcess;
}

export interface CommandConfig {
  componentsPath: string;
  componentName?: string;
  componentProcess(dirent: Dirent): ComponentProcess;
  postProcess?(results: ComponentProcess[]): void;
}

const command = async ({
  componentName,
  componentProcess,
  componentsPath,
  postProcess,
}: CommandConfig): Promise<void> => {
  const components: Array<Promise<ComponentProcess>> = readdirSync(
    componentsPath,
    {
      withFileTypes: true,
    }
  )
    .filter(dirent => {
      if (!dirent.isDirectory()) {
        return false;
      }
      if (componentName && componentName !== dirent.name) {
        return false;
      }
      if (
        !existsSync(path.join(componentsPath, dirent.name, "package-lock.json"))
      ) {
        return false;
      }
      return true;
    })
    .map(
      dirent =>
        new Promise(resolve => {
          const cop: ComponentProcess = componentProcess(dirent);
          cop.process.stdout &&
            cop.process.stdout.on("data", data => {
              console.log(color.green, `${dirent.name}:`);
              console.log(data);
              return;
            });
          cop.process.stderr &&
            cop.process.stderr.on("data", err => console.log(color.red, err));
          cop.process.on("close", () => resolve(cop));
          return;
        })
    );

  const results: ComponentProcess[] = await bluebird.all(components);
  console.log(color.blue, "Done");

  if (postProcess) {
    postProcess(results);
  }
  return;
};

export { command };
