/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref } from "vue";
import { useWebcontainer } from "~/composables/use-webcontainer";
const props = defineProps();
const emit = defineEmits();
const webcontainer = useWebcontainer();
const running = ref(false);
const paused = ref(false);
const output = ref("");
const error = ref("");
const workspaceReady = ref(false);
const currentStage = ref("idle");
const failedStage = ref(null);
const workspacePreview = ref([]);
const workspaceId = ref("");
const downloadUrl = ref("");
const downloadFilename = ref("");
const blobSize = ref(0);
// oxlint-disable-next-line no-control-regex: matches ANSI escape codes from npm output.
const ANSI_REGEX = new RegExp("\\u001B\\[[0-9;]*[A-Za-z]", "g");
const TARBALL_NOTICE_REGEX = /npm notice filename:\s*([^\s]+\.tgz)/i;
const TARBALL_LINE_REGEX = /^\s*([^\s]+\.tgz)\s*$/im;
const TARBALL_MATCH_REGEX = /([^\s]+\.tgz)/gi;
const workspacePath = computed(() => `/workspace/${workspaceId.value}`);
const bundlePath = computed(() => `${workspacePath.value}/bundle`);
const bundlePackages = computed(() => props.packages.map((pkg) => ({
    ...pkg,
    folder: pkg.name
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "package",
})));
const selectedSummary = computed(() => props.packages.map((pkg) => `${pkg.name}@${pkg.version}`).join(", "));
const stageOrder = ["prepare", "pack", "capture"];
const pipelineStages = computed(() => {
    const activeIndex = stageOrder.indexOf(currentStage.value);
    const failedIndex = failedStage.value
        ? stageOrder.indexOf(failedStage.value)
        : -1;
    return [
        {
            value: "prepare",
            title: "Prepare workspace",
            description: "Set up bundle directory.",
        },
        {
            value: "pack",
            title: "Installing packages",
            description: "Fetch and patch dependencies.",
        },
        {
            value: "capture",
            title: "Packing archive",
            description: "Create the tarball.",
        },
    ].map((stage, index) => {
        const isFailed = failedIndex === index;
        const isActive = !isFailed &&
            activeIndex === index &&
            running.value &&
            !paused.value;
        const isPaused = !isFailed && stage.value === "pack" && paused.value;
        const isComplete = currentStage.value === "done" || (!isFailed && activeIndex > index);
        const isPending = !isActive && !isComplete && !isFailed && !isPaused;
        return {
            ...stage,
            status: isFailed
                ? "error"
                : isPaused
                    ? "warning"
                    : isActive
                        ? "active"
                        : isComplete
                            ? "complete"
                            : "pending",
            icon: isActive
                ? "i-lucide-loader-circle"
                : isPaused
                    ? "i-lucide-pause-circle"
                    : isComplete
                        ? "i-lucide-check-circle"
                        : isFailed
                            ? "i-lucide-circle-x"
                            : "i-lucide-circle-dot",
            badge: isPaused
                ? "Paused"
                : isActive
                    ? "In progress"
                    : isComplete
                        ? "Done"
                        : isFailed
                            ? "Failed"
                            : "Waiting",
            ringClass: isActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : isPaused
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : isComplete
                        ? "border-success/40 bg-success/10 text-success"
                        : isFailed
                            ? "border-error/40 bg-error/10 text-error"
                            : "border-default bg-elevated text-muted",
            textClass: isActive
                ? "text-primary"
                : isPaused
                    ? "text-warning"
                    : isComplete
                        ? "text-success"
                        : isFailed
                            ? "text-error"
                            : "text-muted",
            lineClass: index < stageOrder.length - 1
                ? isComplete || isActive || currentStage.value === "done"
                    ? "bg-success/60"
                    : isFailed && failedIndex > index
                        ? "bg-error/60"
                        : "bg-default"
                : "",
            iconClass: isActive ? "animate-spin" : "",
            bodyClass: isPending ? "opacity-80" : "",
        };
    });
});
function appendOutput(chunk) {
    output.value += chunk;
}
function stripAnsi(input) {
    return input.replace(ANSI_REGEX, "").replace(/\r/g, "");
}
function parseTarballName(stdout) {
    const out = stripAnsi(stdout);
    const notice = out.match(TARBALL_NOTICE_REGEX);
    if (notice?.[1])
        return notice[1];
    const line = out.match(TARBALL_LINE_REGEX);
    if (line?.[1])
        return line[1];
    const matches = Array.from(out.matchAll(TARBALL_MATCH_REGEX), (match) => match[1]);
    return matches.at(-1) ?? null;
}
function createWorkspaceId() {
    return (globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
}
function buildWorkspacePreview(packages) {
    const archiveName = `${props.bundleName || "packy-bundle"}-${props.bundleVersion || "0.0.0"}.tgz`;
    return [
        {
            label: workspaceId.value
                ? `workspace/${workspaceId.value}/`
                : "workspace/",
            defaultExpanded: true,
            children: [
                {
                    label: "bundle/",
                    defaultExpanded: true,
                    children: [
                        {
                            label: "package.json",
                            icon: "i-vscode-icons-file-type-json",
                        },
                        {
                            label: "node_modules/",
                            defaultExpanded: true,
                            children: packages.map((pkg) => ({
                                label: pkg.name,
                                defaultExpanded: true,
                                children: [
                                    {
                                        label: "package.json",
                                        icon: "i-vscode-icons-file-type-json",
                                    },
                                ],
                            })),
                        },
                        { label: archiveName, icon: "i-lucide-archive" },
                    ],
                },
            ],
        },
    ];
}
async function prepareWorkspace() {
    if (!props.packages.length)
        throw new Error("No packages selected");
    currentStage.value = "prepare";
    failedStage.value = null;
    workspaceId.value = createWorkspaceId();
    const dependencies = Object.fromEntries(bundlePackages.value.map((pkg) => [pkg.name, pkg.version]));
    const pkgJson = {
        name: props.bundleName || "packy-bundle",
        version: props.bundleVersion || "0.0.0",
        private: true,
        description: `packy bundle for ${selectedSummary.value}`,
        license: "UNLICENSED",
        dependencies,
        bundleDependencies: props.packages.map((pkg) => pkg.name),
        scripts: {
            prepare: "echo skip-prepare",
            prepack: "echo skip-prepack",
            postpack: "echo skip-postpack",
            install: "echo skip-install",
            postinstall: "echo skip-postinstall",
        },
    };
    await webcontainer.write({
        workspace: {
            directory: {
                [workspaceId.value]: {
                    directory: {
                        bundle: {
                            directory: {
                                "package.json": {
                                    file: {
                                        contents: JSON.stringify(pkgJson, null, 2),
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    workspacePreview.value = buildWorkspacePreview(bundlePackages.value);
    workspaceReady.value = true;
}
async function runPack() {
    currentStage.value = "pack";
    appendOutput("$ npm install\n");
    const install = await webcontainer.exec("npm", ["install", "--ignore-scripts", "--install-strategy=nested"], {
        cwd: bundlePath.value,
        env: {
            npm_config_fund: "false",
            npm_config_audit: "false",
            npm_config_progress: "false",
        },
        output(chunk) {
            appendOutput(chunk);
        },
    });
    const installCode = await install.exit;
    if (installCode !== 0)
        throw new Error(`npm install failed with exit code ${installCode}`);
    // Patch each selected package's package.json with bundleDependencies so
    // npm pack recursively includes their nested node_modules in the tarball.
    const fs = webcontainer.container.value.fs;
    for (const pkg of bundlePackages.value) {
        const manifestPath = `${bundlePath.value}/node_modules/${pkg.name}/package.json`;
        const raw = await fs.readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(raw);
        const deps = [
            ...Object.keys(manifest.dependencies ?? {}),
            ...Object.keys(manifest.optionalDependencies ?? {}),
        ];
        manifest.bundleDependencies = deps;
        manifest.bundledDependencies = deps;
        manifest.scripts = {
            ...manifest.scripts,
            prepare: "echo skip-prepare",
            prepack: "echo skip-prepack",
            postpack: "echo skip-postpack",
            install: "echo skip-install",
            postinstall: "echo skip-postinstall",
            prepublish: "echo skip-prepublish",
            publish: "echo skip-publish",
            postpublish: "echo skip-postpublish",
            preinstall: "echo skip-preinstall",
            pretest: "echo skip-pretest",
            test: "echo skip-test",
            posttest: "echo skip-posttest",
        };
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    }
    appendOutput("$ npm pack\n");
    const pack = await webcontainer.exec("npm", ["pack", "--ignore-scripts"], {
        cwd: bundlePath.value,
        env: {
            npm_config_ignore_scripts: "true",
            npm_config_fund: "false",
            npm_config_audit: "false",
            npm_config_progress: "false",
        },
        output(chunk) {
            appendOutput(chunk);
        },
    });
    const code = await pack.exit;
    if (code !== 0)
        throw new Error(`npm pack failed with exit code ${code}`);
}
async function startBundling() {
    if (running.value)
        return;
    running.value = true;
    paused.value = false;
    error.value = "";
    downloadUrl.value = "";
    downloadFilename.value = "";
    blobSize.value = 0;
    output.value = "";
    workspaceReady.value = false;
    workspacePreview.value = [];
    try {
        await prepareWorkspace();
        await runPack();
        currentStage.value = "capture";
        // Check if paused before completing
        if (paused.value) {
            // Don't complete the bundling process
            return;
        }
        const packedFile = parseTarballName(output.value) ??
            `${props.bundleName || "packy-bundle"}-${props.bundleVersion || "0.0.0"}.tgz`;
        const tarball = await webcontainer.read(`${bundlePath.value}/${packedFile}`, null);
        const blob = new Blob([tarball], {
            type: "application/gzip",
        });
        downloadUrl.value = URL.createObjectURL(blob);
        downloadFilename.value = packedFile;
        blobSize.value = blob.size;
        currentStage.value = "done";
        emit("ready", {
            name: props.bundleName || "packy-bundle",
            version: props.bundleVersion || "0.0.0",
            filename: packedFile,
            url: downloadUrl.value,
            output: output.value,
        });
    }
    catch (cause) {
        failedStage.value = ["prepare", "pack", "capture"].includes(currentStage.value)
            ? currentStage.value
            : null;
        currentStage.value = "error";
        error.value = cause instanceof Error ? cause.message : String(cause);
    }
    finally {
        if (!paused.value) {
            running.value = false;
        }
    }
}
onMounted(() => {
    startBundling();
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.UCard | typeof __VLS_components.UCard} */
UCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
{
    const { header: __VLS_7 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "mt-2 text-xl font-semibold" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-muted truncate text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.selectedSummary);
    // @ts-ignore
    [selectedSummary,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-6" },
});
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid gap-6 lg:grid-cols-2" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-3" },
});
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
for (const [stage, index] of __VLS_vFor((__VLS_ctx.pipelineStages))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (stage.value),
        ...{ class: "grid grid-cols-[auto_1fr] gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-[auto_1fr]']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex h-8 w-8 items-center justify-center rounded-full border text-sm" },
        ...{ class: (stage.ringClass) },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    let __VLS_8;
    /** @ts-ignore @type {typeof __VLS_components.UIcon} */
    UIcon;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        name: (stage.icon),
        ...{ class: "shrink-0" },
        ...{ class: (stage.iconClass) },
    }));
    const __VLS_10 = __VLS_9({
        name: (stage.icon),
        ...{ class: "shrink-0" },
        ...{ class: (stage.iconClass) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    if (index < __VLS_ctx.pipelineStages.length - 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "my-2 w-px flex-1 rounded-full" },
            ...{ class: (stage.lineClass) },
        });
        /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-px']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "min-w-0 pb-3" },
        ...{ class: (stage.bodyClass) },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap items-center gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-medium" },
        ...{ class: (stage.textClass) },
    });
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (stage.title);
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.UBadge | typeof __VLS_components.UBadge} */
    UBadge;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        color: (stage.status === 'complete'
            ? 'success'
            : stage.status === 'active'
                ? 'primary'
                : stage.status === 'warning'
                    ? 'warning'
                    : stage.status === 'error'
                        ? 'error'
                        : 'neutral'),
        variant: "soft",
        size: "xs",
    }));
    const __VLS_15 = __VLS_14({
        color: (stage.status === 'complete'
            ? 'success'
            : stage.status === 'active'
                ? 'primary'
                : stage.status === 'warning'
                    ? 'warning'
                    : stage.status === 'error'
                        ? 'error'
                        : 'neutral'),
        variant: "soft",
        size: "xs",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    const { default: __VLS_18 } = __VLS_16.slots;
    (stage.badge);
    // @ts-ignore
    [pipelineStages, pipelineStages,];
    var __VLS_16;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-muted mt-1 text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (stage.description);
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.pre, __VLS_intrinsics.pre)({
    ...{ class: "relative max-h-80 overflow-auto rounded-lg border border-gray-700 bg-black p-4 font-mono text-xs whitespace-pre-wrap text-green-400 before:absolute before:top-2 before:left-4 before:rounded before:bg-black before:px-2 before:py-1 before:text-xs before:text-gray-500" },
});
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-400']} */ ;
/** @type {__VLS_StyleScopedClasses['before:absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['before:top-2']} */ ;
/** @type {__VLS_StyleScopedClasses['before:left-4']} */ ;
/** @type {__VLS_StyleScopedClasses['before:rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['before:bg-black']} */ ;
/** @type {__VLS_StyleScopedClasses['before:px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['before:py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['before:text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['before:text-gray-500']} */ ;
(__VLS_ctx.output || "Waiting for output…");
if (__VLS_ctx.currentStage === 'error') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-error/30 bg-error/10 mt-6 rounded-lg border p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['border-error/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-error/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "min-w-0" },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-error" },
    });
    /** @type {__VLS_StyleScopedClasses['text-error']} */ ;
    (__VLS_ctx.error);
    let __VLS_19;
    /** @ts-ignore @type {typeof __VLS_components.UButton | typeof __VLS_components.UButton} */
    UButton;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        ...{ 'onClick': {} },
        color: "error",
        variant: "soft",
    }));
    const __VLS_21 = __VLS_20({
        ...{ 'onClick': {} },
        color: "error",
        variant: "soft",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    let __VLS_24;
    const __VLS_25 = ({ click: {} },
        { onClick: (__VLS_ctx.startBundling) });
    const { default: __VLS_26 } = __VLS_22.slots;
    // @ts-ignore
    [output, currentStage, error, startBundling,];
    var __VLS_22;
    var __VLS_23;
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
