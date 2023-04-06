import { Docker } from "./index.js";

export function test() {
    const docker = new Docker();
    process.chdir("build-test");

    docker.buildSync(".", "-t", "tsbuild-docker-test");
    docker.runSync("tsbuild-docker-test");

    console.log(docker.getLogsSync("tsbuild-docker-test"));

    process.chdir("..");
}
