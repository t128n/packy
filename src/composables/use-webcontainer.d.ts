import type { WebContainer } from "@webcontainer/api";
import type { Ref } from "vue";

export type WebcontainerExecOptions = {
	path?: string;
	cwd?: string;
	env?: Record<string, string>;
	output?: (chunk: string) => void;
};

export type WebcontainerApi = {
	container: Ref<WebContainer | null>;
	ready: Ref<boolean>;
	loading: Ref<boolean>;
	error: Ref<unknown>;
	init: () => Promise<WebContainer>;
	exec: (
		command: string,
		args?: string[],
		options?: WebcontainerExecOptions,
	) => Promise<import("@webcontainer/api").WebContainerProcess>;
	$: (
		command: string,
		args?: string[],
		options?: WebcontainerExecOptions,
	) => Promise<number>;
	write: (
		files: Record<string, string | ArrayBuffer | Uint8Array | Blob>,
	) => Promise<void>;
	read: (filePath: string) => Promise<string>;
	mount: (
		files: Record<string, string | ArrayBuffer | Uint8Array | Blob>,
	) => Promise<void>;
};

export declare function useWebcontainer(): WebcontainerApi;
