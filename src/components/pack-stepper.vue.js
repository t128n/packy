/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
const currentStep = ref("select");
const selectedPackages = ref([]);
const bundleMeta = ref({ name: "", version: "" });
const bundleResult = ref({
    name: "",
    version: "",
    filename: "",
    url: "",
    output: "",
});
const devMode = ref(false);
const isXlAndUp = ref(false);
let mediaQuery = null;
let updateOrientation = null;
const stepperOrientation = computed(() => isXlAndUp.value ? "vertical" : "horizontal");
const baseItems = [
    {
        value: "select",
        slot: "select",
        title: "Select",
        description: "Choose packages",
        icon: "i-lucide:package-search",
    },
    {
        value: "bundle",
        slot: "bundle",
        title: "Bundle",
        description: "Bundle packages into tarball",
        icon: "i-lucide:package-open",
    },
    {
        value: "download",
        slot: "download",
        title: "Download",
        description: "Download tarball",
        icon: "i-lucide:file-down",
    },
];
// Mock data for devMode
const mockPackages = [
    { name: "lodash", version: "4.17.21" },
    { name: "axios", version: "1.6.0" },
    { name: "vue", version: "3.5.32" },
];
const mockBundleMeta = {
    name: "dev-bundle",
    version: "1.0.0",
};
const mockBundleResult = {
    name: "dev-bundle",
    version: "1.0.0",
    filename: "dev-bundle-1.0.0.tgz",
    url: "#",
    output: "Mock bundling process completed successfully!\n\nInstalled packages:\n- lodash@4.17.21\n- axios@1.6.0\n- vue@3.5.32\n\nBundle created at: dev-bundle-1.0.0.tgz",
};
const items = computed(() => {
    const currentIndex = baseItems.findIndex((item) => item.value === currentStep.value);
    return baseItems.map((item, index) => ({
        ...item,
        disabled: devMode.value
            ? false
            : index > currentIndex ||
                (currentStep.value === "download" && index === 1),
    }));
});
function handleSelectAdvance(payload) {
    selectedPackages.value = payload.packages;
    bundleMeta.value = {
        name: payload.bundleName,
        version: payload.bundleVersion,
    };
    currentStep.value = "bundle";
}
function handleBundleReady(payload) {
    bundleResult.value = payload;
    currentStep.value = "download";
}
function handlePackMorePackages() {
    selectedPackages.value = [];
    bundleMeta.value = { name: "", version: "" };
    bundleResult.value = {
        name: "",
        version: "",
        filename: "",
        url: "",
        output: "",
    };
    currentStep.value = "select";
}
function handleDownloadUrlRevoke(url) {
    if (url) {
        URL.revokeObjectURL(url);
    }
}
// DevMode functions
function skipToBundle() {
    selectedPackages.value = mockPackages;
    bundleMeta.value = mockBundleMeta;
    currentStep.value = "bundle";
}
function skipToDownload() {
    selectedPackages.value = mockPackages;
    bundleMeta.value = mockBundleMeta;
    bundleResult.value = mockBundleResult;
    currentStep.value = "download";
}
function resetToSelect() {
    handlePackMorePackages();
}
onMounted(() => {
    mediaQuery = window.matchMedia("(min-width: 1280px)");
    updateOrientation = () => {
        isXlAndUp.value = mediaQuery?.matches ?? false;
    };
    updateOrientation();
    mediaQuery.addEventListener("change", updateOrientation);
    window.addEventListener("resize", updateOrientation);
    // Check for devMode query parameter
    const urlParams = new URLSearchParams(window.location.search);
    devMode.value = urlParams.has("devMode");
    if (devMode.value) {
        // Pre-populate with mock data for easier testing
        selectedPackages.value = mockPackages;
        bundleMeta.value = mockBundleMeta;
    }
});
onBeforeUnmount(() => {
    if (mediaQuery && updateOrientation) {
        mediaQuery.removeEventListener("change", updateOrientation);
        window.removeEventListener("resize", updateOrientation);
    }
});
const __VLS_ctx = {
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
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    variant: "outline",
    ...{ class: "z-10" },
}));
const __VLS_2 = __VLS_1({
    variant: "outline",
    ...{ class: "z-10" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['z-10']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
if (__VLS_ctx.devMode) {
    {
        const { header: __VLS_7 } = __VLS_3.slots;
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
        let __VLS_8;
        /** @ts-ignore @type {typeof __VLS_components.UBadge | typeof __VLS_components.UBadge} */
        UBadge;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
            color: "warning",
            variant: "soft",
        }));
        const __VLS_10 = __VLS_9({
            color: "warning",
            variant: "soft",
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        const { default: __VLS_13 } = __VLS_11.slots;
        let __VLS_14;
        /** @ts-ignore @type {typeof __VLS_components.UIcon} */
        UIcon;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
            name: "i-lucide-zap",
            ...{ class: "mr-1 h-4 w-4" },
        }));
        const __VLS_16 = __VLS_15({
            name: "i-lucide-zap",
            ...{ class: "mr-1 h-4 w-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-4']} */ ;
        // @ts-ignore
        [devMode,];
        var __VLS_11;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        let __VLS_19;
        /** @ts-ignore @type {typeof __VLS_components.UButton | typeof __VLS_components.UButton} */
        UButton;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "neutral",
        }));
        const __VLS_21 = __VLS_20({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "neutral",
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        let __VLS_24;
        const __VLS_25 = ({ click: {} },
            { onClick: (__VLS_ctx.resetToSelect) });
        const { default: __VLS_26 } = __VLS_22.slots;
        // @ts-ignore
        [resetToSelect,];
        var __VLS_22;
        var __VLS_23;
        let __VLS_27;
        /** @ts-ignore @type {typeof __VLS_components.UButton | typeof __VLS_components.UButton} */
        UButton;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "primary",
        }));
        const __VLS_29 = __VLS_28({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        let __VLS_32;
        const __VLS_33 = ({ click: {} },
            { onClick: (__VLS_ctx.skipToBundle) });
        const { default: __VLS_34 } = __VLS_30.slots;
        // @ts-ignore
        [skipToBundle,];
        var __VLS_30;
        var __VLS_31;
        let __VLS_35;
        /** @ts-ignore @type {typeof __VLS_components.UButton | typeof __VLS_components.UButton} */
        UButton;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "success",
        }));
        const __VLS_37 = __VLS_36({
            ...{ 'onClick': {} },
            size: "xs",
            variant: "ghost",
            color: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        let __VLS_40;
        const __VLS_41 = ({ click: {} },
            { onClick: (__VLS_ctx.skipToDownload) });
        const { default: __VLS_42 } = __VLS_38.slots;
        // @ts-ignore
        [skipToDownload,];
        var __VLS_38;
        var __VLS_39;
        // @ts-ignore
        [];
    }
}
let __VLS_43;
/** @ts-ignore @type {typeof __VLS_components.UStepper | typeof __VLS_components.UStepper} */
UStepper;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
    modelValue: (__VLS_ctx.currentStep),
    linear: (!__VLS_ctx.devMode),
    orientation: (__VLS_ctx.stepperOrientation),
    items: (__VLS_ctx.items),
    ...{ class: "w-full gap-6" },
}));
const __VLS_45 = __VLS_44({
    modelValue: (__VLS_ctx.currentStep),
    linear: (!__VLS_ctx.devMode),
    orientation: (__VLS_ctx.stepperOrientation),
    items: (__VLS_ctx.items),
    ...{ class: "w-full gap-6" },
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
const { default: __VLS_48 } = __VLS_46.slots;
{
    const { select: __VLS_49 } = __VLS_46.slots;
    let __VLS_50;
    /** @ts-ignore @type {typeof __VLS_components.StepSelectView} */
    StepSelectView;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
        ...{ 'onAdvance': {} },
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onAdvance': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_55;
    const __VLS_56 = ({ advance: {} },
        { onAdvance: (__VLS_ctx.handleSelectAdvance) });
    var __VLS_53;
    var __VLS_54;
    // @ts-ignore
    [devMode, currentStep, stepperOrientation, items, handleSelectAdvance,];
}
{
    const { bundle: __VLS_57 } = __VLS_46.slots;
    if (__VLS_ctx.currentStep === 'bundle') {
        let __VLS_58;
        /** @ts-ignore @type {typeof __VLS_components.StepBundleView} */
        StepBundleView;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
            ...{ 'onReady': {} },
            packages: (__VLS_ctx.selectedPackages),
            bundleName: (__VLS_ctx.bundleMeta.name),
            bundleVersion: (__VLS_ctx.bundleMeta.version),
        }));
        const __VLS_60 = __VLS_59({
            ...{ 'onReady': {} },
            packages: (__VLS_ctx.selectedPackages),
            bundleName: (__VLS_ctx.bundleMeta.name),
            bundleVersion: (__VLS_ctx.bundleMeta.version),
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        let __VLS_63;
        const __VLS_64 = ({ ready: {} },
            { onReady: (__VLS_ctx.handleBundleReady) });
        var __VLS_61;
        var __VLS_62;
    }
    // @ts-ignore
    [currentStep, selectedPackages, bundleMeta, bundleMeta, handleBundleReady,];
}
{
    const { download: __VLS_65 } = __VLS_46.slots;
    if (__VLS_ctx.currentStep === 'download') {
        let __VLS_66;
        /** @ts-ignore @type {typeof __VLS_components.StepDownloadView} */
        StepDownloadView;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
            ...{ 'onPackMorePackages': {} },
            ...{ 'onDisposeUrl': {} },
            bundleName: (__VLS_ctx.bundleResult.name || __VLS_ctx.bundleMeta.name),
            bundleVersion: (__VLS_ctx.bundleResult.version || __VLS_ctx.bundleMeta.version),
            filename: (__VLS_ctx.bundleResult.filename),
            url: (__VLS_ctx.bundleResult.url),
            output: (__VLS_ctx.bundleResult.output),
        }));
        const __VLS_68 = __VLS_67({
            ...{ 'onPackMorePackages': {} },
            ...{ 'onDisposeUrl': {} },
            bundleName: (__VLS_ctx.bundleResult.name || __VLS_ctx.bundleMeta.name),
            bundleVersion: (__VLS_ctx.bundleResult.version || __VLS_ctx.bundleMeta.version),
            filename: (__VLS_ctx.bundleResult.filename),
            url: (__VLS_ctx.bundleResult.url),
            output: (__VLS_ctx.bundleResult.output),
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        let __VLS_71;
        const __VLS_72 = ({ packMorePackages: {} },
            { onPackMorePackages: (__VLS_ctx.handlePackMorePackages) });
        const __VLS_73 = ({ disposeUrl: {} },
            { onDisposeUrl: (__VLS_ctx.handleDownloadUrlRevoke) });
        var __VLS_69;
        var __VLS_70;
    }
    // @ts-ignore
    [currentStep, bundleMeta, bundleMeta, bundleResult, bundleResult, bundleResult, bundleResult, bundleResult, handlePackMorePackages, handleDownloadUrlRevoke,];
}
// @ts-ignore
[];
var __VLS_46;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
