<script lang="ts">
	import {
		Container,
		Nav,
		Navbar,
		NavbarBrand,
		NavItem,
	} from "sveltestrap";

	type Props = {
		onShowHelp: () => void;
	};

	let { onShowHelp }: Props = $props();

	function openHelp(event: MouseEvent) {
		event.preventDefault();
		onShowHelp();
	}
</script>

<Navbar expand="md" container={false} class="bg-body-tertiary border-bottom">
	<Container
		fluid
		class="px-3 px-lg-4 d-flex flex-wrap align-items-center justify-content-between gap-2"
	>
		<NavbarBrand href="/" class="fw-semibold">packy</NavbarBrand>

		<nav aria-label="Main">
			<Nav navbar class="flex-row flex-wrap gap-3">
				<NavItem>
					<a class="nav-link" href="#bundle">Bundle</a>
				</NavItem>
				<NavItem>
					<a class="nav-link" href="#how-it-works" onclick={openHelp}>
						How it works
					</a>
				</NavItem>
				<NavItem>
					<a
						class="nav-link"
						href="https://github.com/t128n/packy"
						target="_blank"
						rel="noreferrer">GitHub</a
					>
				</NavItem>
			</Nav>
		</nav>
	</Container>
</Navbar>
