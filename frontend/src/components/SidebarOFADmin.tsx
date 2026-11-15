import AdminPortalShell from "./AdminPortalShell";

/**
 * Legacy SidebarOFADmin wrapper retained for backwards import compatibility.
 * All primary admin pages now render directly inside AdminPortalShell.
 */
function SidebarOFADmin() {
  return null;
}

export { AdminPortalShell };
export default SidebarOFADmin;
