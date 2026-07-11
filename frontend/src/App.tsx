import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./lib/auth";
import AddItem from "./routes/AddItem";
import CollectionDetail from "./routes/CollectionDetail";
import Collections from "./routes/Collections";
import ItemDetail from "./routes/ItemDetail";
import Login from "./routes/Login";
import TagManagement from "./routes/TagManagement";

function Protected({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/collections" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/collections"
          element={
            <Protected>
              <Collections />
            </Protected>
          }
        />
        <Route
          path="/collections/:id"
          element={
            <Protected>
              <CollectionDetail />
            </Protected>
          }
        />
        <Route
          path="/collections/:id/add"
          element={
            <Protected>
              <AddItem />
            </Protected>
          }
        />
        <Route
          path="/collections/:id/items/:itemId"
          element={
            <Protected>
              <ItemDetail />
            </Protected>
          }
        />
        <Route
          path="/collections/:id/tags"
          element={
            <Protected>
              <TagManagement />
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
