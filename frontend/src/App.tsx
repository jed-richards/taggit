import { Navigate, Route, Routes } from "react-router-dom";
import AddItem from "./routes/AddItem";
import CollectionDetail from "./routes/CollectionDetail";
import Collections from "./routes/Collections";
import ItemDetail from "./routes/ItemDetail";
import Login from "./routes/Login";
import TagManagement from "./routes/TagManagement";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/collections" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/collections" element={<Collections />} />
      <Route path="/collections/:id" element={<CollectionDetail />} />
      <Route path="/collections/:id/add" element={<AddItem />} />
      <Route path="/collections/:id/items/:itemId" element={<ItemDetail />} />
      <Route path="/collections/:id/tags" element={<TagManagement />} />
    </Routes>
  );
}
