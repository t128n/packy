import React from "react";

export type SwStatus =
	| "unsupported"
	| "insecure"
	| "unregistered"
	| "installing"
	| "installed"
	| "active"
	| "controlling";

export function useSwStatus(): SwStatus {
	const [status, setStatus] = React.useState<SwStatus>(() => {
		if (!("serviceWorker" in navigator)) return "unsupported";
		if (!window.isSecureContext) return "insecure";
		return navigator.serviceWorker.controller ? "controlling" : "unregistered";
	});

	React.useEffect(() => {
		if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

		const onControllerChange = () => setStatus("controlling");
		navigator.serviceWorker.addEventListener(
			"controllerchange",
			onControllerChange,
		);

		let canceled = false;

		const track = async () => {
			try {
				const reg = await navigator.serviceWorker.getRegistration();
				if (!reg || canceled) return;

				const update = () => {
					if (reg.installing) setStatus("installing");
					else if (reg.waiting) setStatus("installed");
					else if (reg.active) {
						setStatus(
							navigator.serviceWorker.controller ? "controlling" : "active",
						);
					} else {
						setStatus("unregistered");
					}
				};

				update();

				reg.addEventListener("updatefound", update);
				const sw = reg.installing || reg.waiting || reg.active;
				if (sw) sw.addEventListener("statechange", update);
			} catch {
				// ignore
			}
		};

		track();

		return () => {
			canceled = true;
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, []);

	return status;
}
