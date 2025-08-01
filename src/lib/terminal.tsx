import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

export type TerminalLevel = "info" | "warn" | "error";

export type TerminalEntry = {
	id: string;
	level: TerminalLevel;
	text: string;
	timestamp: number;
};

export type TerminalAPI = {
	log: (text: string) => string;
	warning: (text: string) => string;
	error: (text: string) => string;
	append: (id: string, textChunk: string) => void;
	clear: () => void;
};

const TerminalContext = createContext<TerminalAPI | null>(null);
const TerminalEntriesContext = createContext<TerminalEntry[] | null>(null);

function useStableId() {
	const ref = useRef(0);
	return useCallback(() => {
		ref.current += 1;
		return String(ref.current);
	}, []);
}

export function TerminalProvider({ children }: PropsWithChildren) {
	const [entries, setEntries] = useState<TerminalEntry[]>([]);
	const genId = useStableId();

	const api = useMemo<TerminalAPI>(() => {
		const push = (level: TerminalLevel, text: string) => {
			const id = genId();
			const item: TerminalEntry = {
				id,
				level,
				text,
				timestamp: Date.now(),
			};
			setEntries((prev) => [...prev, item]);
			return id;
		};

		return {
			log: (text) => push("info", text),
			warning: (text) => push("warn", text),
			error: (text) => push("error", text),
			append: (id, textChunk) => {
				if (!textChunk) return;
				setEntries((prev) =>
					prev.map((e) =>
						e.id === id ? { ...e, text: e.text + textChunk } : e,
					),
				);
			},
			clear: () => setEntries([]),
		};
	}, [genId]);

	return (
		<TerminalContext.Provider value={api}>
			<TerminalEntriesContext.Provider value={entries}>
				{children}
			</TerminalEntriesContext.Provider>
		</TerminalContext.Provider>
	);
}

export function useTerminal(): TerminalAPI {
	const ctx = useContext(TerminalContext);
	if (!ctx) {
		throw new Error("useTerminal must be used within a TerminalProvider");
	}
	return ctx;
}

export function useTerminalEntries(): TerminalEntry[] {
	const entries = useContext(TerminalEntriesContext);
	if (!entries) {
		throw new Error(
			"useTerminalEntries must be used within a TerminalProvider",
		);
	}
	return entries;
}
