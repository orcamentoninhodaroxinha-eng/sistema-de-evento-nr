import { useLoginUser } from "@/hooks/useLoginUser";
import Events from "@/pages/Events";
import AprovadorHome from "@/pages/AprovadorHome";

export default function RoleHome() {
  const loginUser = useLoginUser();
  
  if (loginUser?.role === "aprovador") {
    return <AprovadorHome />;
  }
  
  return <Events />;
}