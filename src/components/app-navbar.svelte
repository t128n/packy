<script lang="ts">
	import {
		Container,
		Nav,
		Navbar,
		NavbarBrand,
		NavItem,
		NavLink,
	} from "sveltestrap";
</script>

<Navbar expand="md" container={false} class="bg-body-tertiary border-bottom">
	<Container
		class="d-flex flex-wrap align-items-center justify-content-between gap-2"
	>
		<NavbarBrand href="/" class="fw-semibold">packy</NavbarBrand>

		<nav aria-label="Main">
			<Nav navbar class="flex-row flex-wrap gap-3">
				<NavItem>
					<NavLink href="#bundle">Bundle</NavLink>
				</NavItem>
				<NavItem>
					<NavLink href="#how-it-works">How it works</NavLink>
				</NavItem>
				<NavItem>
					<NavLink
						href="https://github.com/t128n/packy"
						target="_blank"
						rel="noreferrer">GitHub</NavLink
					>
				</NavItem>
			</Nav>
		</nav>
	</Container>
</Navbar>
