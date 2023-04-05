export interface ContainerData {
    Command: string;
    CreatedAt: string;
    ID: string;
    Image: string;
    Labels: string;
    LocalVolumes: string;
    Mounts: string;
    Names: string;
    Networks: string;
    Ports: string;
    RunningFor: string;
    Size: string;
    State: string;
    Status: string;
}

export class Docker {
    private exec = declareExec("docker", {async: false, mode: "manual"});
    private execAsync = declareExec("docker", {async: true, mode: "manual"});
    private execInherit = declareExec("docker", {async: false, mode: "manual", stderr: "inherit", stdout: "inherit"});
    private execAsyncInherit = declareExec("docker", {async: true, mode: "manual", stderr: "inherit", stdout: "inherit"});

    public getAllContainers(): ContainerData[] {
        const out: TSBuildSubprocess | undefined = this.exec("ps", "-a", "-s", "--format", "{{json .}}") as unknown as TSBuildSubprocess;
        if (out) {
            const arr = out.stdout?.toString().split("\n");
            const jsonArr: ContainerData[] = [];
            arr?.pop();
            arr?.forEach((item: string) => {
                jsonArr.push(JSON.parse(item))
            })
            return jsonArr ?? [];
        }
        else return []
    }

    public getAllContainersByStatus(status: "created" | "restarting" | "running" | "removing" | "paused" | "exited" | "dead") {
        const out: TSBuildSubprocess | undefined = this.exec("ps", "-a", "-s", "--filter", `status=${status}`,
                                                             "--format", "{{json .}}") as unknown as TSBuildSubprocess;
        if (out) {
            const arr = out.stdout?.toString().split("\n");
            const jsonArr: ContainerData[] = [];
            arr?.pop();
            arr?.forEach((item: string) => {
                jsonArr.push(JSON.parse(item))
            })
            return jsonArr ?? [];
        }
        else return []
    }

    public rawSyncExecute(...args: string[]) {
        this.execInherit(...args)
    }

    public rawExecute(...args: string[]) {
        this.execAsync(...args)
    }
}
