import { Subprocess } from "bun";
import { cpus } from "os";

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

export interface ContainerRunConfig {
    MaxMemory?: number;
    MemoryUnit?: "MB" | "GB" | "TB";
    MaxSwap?: number;
    SwapUnit?: "B" | "KB" | "MB" | "GB" | "TB";
    Swappiness?: number;
    CoreCount?: number;
    Ports?: {
        In: number;
        Out: number;
    }
    Env?: Record<string, string>;
    AutoRemove?: boolean;
}

export class Docker {
    private exec = declareExec("docker", {async: false, mode: "manual"});
    private execAsync = declareExec("docker", {async: true, mode: "manual"});
    private execInherit = declareExec("docker", {async: false, mode: "manual", stderr: "inherit", stdout: "inherit"});
    private execAsyncInherit = declareExec("docker", {async: true, mode: "manual", stderr: "inherit", stdout: "inherit"});
    private runingContianers = new Map<string, string>();

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

    public async build(target: string, ...options: string[]) {
        await this.execAsyncInherit("build", ...options, target);
    }

    public buildSync(target: string, ...options: string[]) {
        this.execInherit("build", ...options, target)
    }

    private handleRunConfig(o: ContainerRunConfig): string[] {
        const args = [];

        if (o.MaxSwap ?? 0 < 0) o.MaxSwap = 0;
        if (o.MaxMemory ?? 0 < 0) o.MaxMemory = 0;

        if (typeof o.MaxMemory == "number" && ["MB", "GB", "TB"].includes(o.MemoryUnit ?? "")) {
            args.push(`--memory=${o.MaxMemory}${o.MemoryUnit}`);
        }

        if (typeof o.MaxSwap == "number" && ["B", "KB", "MB", "GB", "TB"].includes(o.SwapUnit ?? "")) {
            args.push(`--memory-swap=${o.MaxSwap}${o.SwapUnit}`);
        }

        if (typeof o.Swappiness == "number") {
            o.Swappiness = Math.max(0, Math.min(o.Swappiness, 100));
            args.push(`--memory-swappiness=${o.Swappiness}`);
        }

        if (typeof o.CoreCount == "number") {
            o.CoreCount = Math.max(0, Math.min(o.CoreCount, cpus().length)); 
            args.push(`--cpus=${o.CoreCount}`);
        }

        if (o.Ports) {
            args.push("--expose")
            args.push(`${o.Ports.In}:${o.Ports.Out}`)
        }

        if (o.Env) {
            for (const key in o.Env) {
                args.push("--env");
                args.push(`${key}=${o.Env[key]}`);
            }
        }

        if (o.AutoRemove) {
            args.push("--rm")
        }

        return args;
    }

    public async run(name: string, options: ContainerRunConfig = {}) {
        const args = this.handleRunConfig(options);

        const out = (await this.execAsync("run", "-d", ...args, name)) as unknown as TSBuildSubprocess;
        // @ts-ignore quiet
        const id = await new Response(out.stdout).text();
        this.runingContianers.set(name, id.replace("\n", "".replace("\n", "")));
    }

    public runSync(name: string, options: ContainerRunConfig = {}) {
        const args = this.handleRunConfig(options);

        const out = this.exec("run", "-d", ...args, name) as unknown as TSBuildSubprocess;

        this.runingContianers.set(name, out.stdout?.toString().replace("\n", "") ?? "E");
    }

    public async getLogs(name: string): Promise<{ stdout: string, stderr: string }> {
        const logs = {
            stdout: "",
            stderr: "",
        };

        if (!this.runingContianers.has(name)) return Promise.resolve(logs);

        const out = (await this.execAsync("logs", this.runingContianers.get(name) ?? "")) as unknown as TSBuildSubprocess;

        logs.stdout = out.stdout?.toString() ?? "";
        logs.stderr = out.stderr?.toString() ?? "";

        return logs;
    }

    public getLogsSync(name: string): { stdout: string, stderr: string } {

        const logs = {
            stdout: "",
            stderr: "",
        };

        if (!this.runingContianers.has(name)) return logs;

        const out = this.exec("logs", this.runingContianers.get(name) ?? "") as unknown as TSBuildSubprocess;

        logs.stdout = out.stdout?.toString() ?? "";
        logs.stderr = out.stderr?.toString() ?? "";

        return logs;
    }

    public rawExecuteSync(...args: string[]) {
        this.execInherit(...args)
    }

    public async rawExecute(...args: string[]) {
        await this.execAsyncInherit(...args)
    }
}
