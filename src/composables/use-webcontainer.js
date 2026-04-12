import { WebContainer } from "@webcontainer/api";
import { computed, ref } from "vue";
let containerPromise = null;
const container = ref(null);
const ready = ref(false);
const pending = ref(false);
const loading = computed(() => pending.value);
const error = ref(null);
const defaultEnv = {
    CI: "1",
    TERM: "dumb",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    npm_config_color: "false",
    npm_config_progress: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
    npm_config_update_notifier: "false",
    npm_config_loglevel: "error",
};
function getContainer() {
    if (!containerPromise) {
        containerPromise = (async () => {
            const instance = await WebContainer.boot();
            container.value = instance;
            ready.value = true;
            return instance;
        })().catch((cause) => {
            containerPromise = null;
            error.value = cause;
            throw cause;
        });
    }
    return containerPromise;
}
export function useWebcontainer() {
    void init();
    async function init() {
        if (container.value) {
            return container.value;
        }
        try {
            pending.value = true;
            const instance = await getContainer();
            error.value = null;
            return instance;
        }
        catch (cause) {
            error.value = cause;
            throw cause;
        }
        finally {
            pending.value = false;
        }
    }
    async function exec(command, args = [], options = {}) {
        const container = await init();
        const cwd = options.cwd ?? options.path ?? "/";
        const process = await container.spawn(command, args, {
            cwd,
            env: {
                ...defaultEnv,
                ...options.env,
            },
        });
        if (options.output) {
            process.output.pipeTo(new WritableStream({
                write(chunk) {
                    options.output?.(typeof chunk === "string" ? chunk : String(chunk));
                },
            }));
        }
        return process;
    }
    async function $(command, args = [], options = {}) {
        const process = await exec(command, args, options);
        return process.exit;
    }
    async function write(files) {
        const container = await init();
        await container.mount(files);
    }
    async function read(filePath, encoding = "utf-8") {
        const container = await init();
        return container.fs.readFile(filePath, encoding);
    }
    async function mount(files) {
        const container = await init();
        await container.mount(files);
    }
    return {
        container,
        ready,
        pending,
        loading,
        error,
        init,
        exec,
        $,
        write,
        read,
        mount,
    };
}
