import { Docker } from "./index.js";

export function test() {
    const docker = new Docker();
    console.log(docker.getAllContainers())
}
