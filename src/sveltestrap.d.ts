// SvelteStrap 5 ships Svelte 3-era declarations that omit props used by this
// Svelte 5 app. Keep the runtime components, but type their public surface
// loosely until upstream publishes Svelte 5-compatible types.
declare module "sveltestrap" {
	import type { Component } from "svelte";

	type StrapComponent = Component<Record<string, any>> & {
		$on(type: string, callback: (event: any) => void): () => void;
	};

	export const Button: StrapComponent;
	export const Container: StrapComponent;
	export const Input: StrapComponent;
	export const Nav: StrapComponent;
	export const Navbar: StrapComponent;
	export const NavbarBrand: StrapComponent;
	export const NavItem: StrapComponent;
	export const NavLink: StrapComponent;
	export const Spinner: StrapComponent;
}
