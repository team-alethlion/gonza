import AgencyLayout from "./AgencyLayout";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AgencyLayout>
      {children}
    </AgencyLayout>
  );
};

export default Layout;
