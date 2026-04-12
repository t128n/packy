/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted } from "vue";
import { useWebcontainer } from "~/composables/use-webcontainer";
const webcontainer = useWebcontainer();
const logoSrc = computed(() => {
    if (webcontainer.pending.value) {
        return "/packy_waking_up.svg";
    }
    if (webcontainer.error.value) {
        return "/packy_sad.svg";
    }
    if (webcontainer.ready.value) {
        return "/packy_happy.svg";
    }
    return "/packy_sleep.svg";
});
const hasWebcontainerError = computed(() => Boolean(webcontainer.error.value));
const webcontainerErrorMessage = computed(() => {
    const error = webcontainer.error.value;
    if (error instanceof Error) {
        return error.message;
    }
    return error ? String(error) : "";
});
onMounted(() => {
    if (!crossOriginIsolated) {
        webcontainer.error.value = new Error("Cross-origin isolation is required to start WebContainers.");
        console.error("WebContainers require cross-origin isolation. Restart the Vite server with COOP/COEP headers enabled.");
        return;
    }
    void webcontainer.init();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.UHeader | typeof __VLS_components.UHeader} */
UHeader;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: "packy",
}));
const __VLS_2 = __VLS_1({
    title: "packy",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
{
    const { title: __VLS_6 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        src: (__VLS_ctx.logoSrc),
        alt: "",
        ...{ class: "mt-1 h-14 w-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-14']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-auto']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-semibold" },
    });
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs font-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    // @ts-ignore
    [logoSrc,];
}
// @ts-ignore
[];
var __VLS_3;
if (__VLS_ctx.hasWebcontainerError) {
    let __VLS_7;
    /** @ts-ignore @type {typeof __VLS_components.UModal | typeof __VLS_components.UModal} */
    UModal;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        open: (true),
        dismissible: (false),
        modal: (true),
        title: "WebContainers unavailable",
        description: "packy needs a cross-origin isolated browser environment to run WebContainers.",
        close: (false),
    }));
    const __VLS_9 = __VLS_8({
        open: (true),
        dismissible: (false),
        modal: (true),
        title: "WebContainers unavailable",
        description: "packy needs a cross-origin isolated browser environment to run WebContainers.",
        close: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    const { default: __VLS_12 } = __VLS_10.slots;
    {
        const { body: __VLS_13 } = __VLS_10.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.webcontainerErrorMessage || "Unable to start the in-browser runtime.");
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-muted mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        // @ts-ignore
        [hasWebcontainerError, webcontainerErrorMessage,];
    }
    // @ts-ignore
    [];
    var __VLS_10;
}
let __VLS_14;
/** @ts-ignore @type {typeof __VLS_components.HeroBackground} */
HeroBackground;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({}));
const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
