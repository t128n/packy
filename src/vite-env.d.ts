declare const __GIT_COMMIT_HASH__: string;

declare module "*.svg?component" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent;
	export default component;
}
