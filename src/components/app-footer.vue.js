/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import nodeModulesIcon from "~/assets/node-modules.svg?component";
import npmxIcon from "~/assets/npmx.svg?component";
const commitHash = __GIT_COMMIT_HASH__;
const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;
const primaryStack = [
    {
        name: "WebContainers",
        url: "https://webcontainers.io",
        icon: "i-simple-icons:stackblitz",
    },
    { name: "NPM", url: "https://www.npmjs.com/", icon: "i-simple-icons:npm" },
    {
        name: "Vue.js",
        url: "https://vuejs.org/",
        icon: "i-simple-icons:vuedotjs",
    },
    { name: "Vite", url: "https://vitejs.dev/", icon: "i-simple-icons:vite" },
    {
        name: "Nuxt UI",
        url: "https://ui.nuxt.com/",
        icon: "i-simple-icons:nuxtdotjs",
    },
];
const additionalTools = [
    { name: "npmx", url: "https://npmx.dev/", icon: npmxIcon },
    {
        name: "node-modules",
        url: "https://node-modules.dev/",
        icon: nodeModulesIcon,
    },
    {
        name: "pkg-size",
        url: "https://pkg-size.dev/",
        icon: "i-lucide:package-search",
    },
];
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.USeparator} */
USeparator;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    type: "dashed",
    ...{ class: "h-px" },
}));
const __VLS_2 = __VLS_1({
    type: "dashed",
    ...{ class: "h-px" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['h-px']} */ ;
let __VLS_5;
/** @ts-ignore @type {typeof __VLS_components.UFooter | typeof __VLS_components.UFooter} */
UFooter;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({}));
const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
const { default: __VLS_10 } = __VLS_8.slots;
{
    const { left: __VLS_11 } = __VLS_8.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-muted flex flex-wrap items-center gap-x-1 gap-y-1 text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: (__VLS_ctx.commitUrl),
        target: "_blank",
        rel: "noreferrer",
        ...{ class: "font-mono text-xs hover:underline" },
        title: (__VLS_ctx.commitHash),
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
    (__VLS_ctx.commitHash.slice(0, 7));
    // @ts-ignore
    [commitUrl, commitHash, commitHash,];
}
{
    const { right: __VLS_12 } = __VLS_8.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap items-center gap-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.UButton} */
    UButton;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        icon: "i-simple-icons:github",
        color: "neutral",
        variant: "ghost",
        to: "https://github.com/t128n/packy",
        target: "_blank",
        rel: "noreferrer",
        'aria-label': "GitHub Repository",
        title: "GitHub Repository",
    }));
    const __VLS_15 = __VLS_14({
        icon: "i-simple-icons:github",
        color: "neutral",
        variant: "ghost",
        to: "https://github.com/t128n/packy",
        target: "_blank",
        rel: "noreferrer",
        'aria-label': "GitHub Repository",
        title: "GitHub Repository",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.UButton} */
    UButton;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        icon: "i-lucide-globe",
        color: "neutral",
        variant: "ghost",
        to: "https://t128.dev",
        target: "_blank",
        rel: "noreferrer",
        'aria-label': "Personal website",
        title: "Personal website",
    }));
    const __VLS_20 = __VLS_19({
        icon: "i-lucide-globe",
        color: "neutral",
        variant: "ghost",
        to: "https://t128.dev",
        target: "_blank",
        rel: "noreferrer",
        'aria-label': "Personal website",
        title: "Personal website",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    // @ts-ignore
    [];
}
{
    const { default: __VLS_23 } = __VLS_8.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col gap-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-muted flex flex-row flex-wrap items-center justify-center gap-1.5 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    for (const [tech, index] of __VLS_vFor((__VLS_ctx.primaryStack))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (tech.name),
            ...{ class: "flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (tech.url),
            target: "_blank",
            rel: "noreferrer",
            ...{ class: "flex items-center hover:opacity-80" },
            'aria-label': (tech.name),
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:opacity-80']} */ ;
        let __VLS_24;
        /** @ts-ignore @type {typeof __VLS_components.UIcon} */
        UIcon;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
            name: (tech.icon),
            ...{ class: "size-3" },
        }));
        const __VLS_26 = __VLS_25({
            name: (tech.icon),
            ...{ class: "size-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        /** @type {__VLS_StyleScopedClasses['size-3']} */ ;
        if (index < __VLS_ctx.primaryStack.length - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ml-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ml-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
        }
        // @ts-ignore
        [primaryStack, primaryStack,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-muted flex flex-row flex-wrap items-center justify-center gap-1.5 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    for (const [tool, index] of __VLS_vFor((__VLS_ctx.additionalTools))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (tool.name),
            ...{ class: "flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (tool.url),
            target: "_blank",
            rel: "noreferrer",
            ...{ class: "flex items-center hover:opacity-80" },
            'aria-label': (tool.name),
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:opacity-80']} */ ;
        let __VLS_29;
        /** @ts-ignore @type {typeof __VLS_components.UIcon} */
        UIcon;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            name: (tool.icon),
            ...{ class: "size-3" },
        }));
        const __VLS_31 = __VLS_30({
            name: (tool.icon),
            ...{ class: "size-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        /** @type {__VLS_StyleScopedClasses['size-3']} */ ;
        if (index < __VLS_ctx.additionalTools.length - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ml-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ml-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
        }
        // @ts-ignore
        [additionalTools, additionalTools,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-muted flex justify-center text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "https://js.org/",
        target: "_blank",
        rel: "noreferrer",
        ...{ class: "ml-1 inline-flex items-center gap-1 hover:underline" },
    });
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
    let __VLS_34;
    /** @ts-ignore @type {typeof __VLS_components.UIcon} */
    UIcon;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        name: "i-simple-icons:javascript",
        ...{ class: "size-3" },
    }));
    const __VLS_36 = __VLS_35({
        name: "i-simple-icons:javascript",
        ...{ class: "size-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    /** @type {__VLS_StyleScopedClasses['size-3']} */ ;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_8;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
