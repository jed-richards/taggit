import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("root redirects to the collections screen", () => {
  renderAt("/");
  expect(screen.getByText(/Collections — coming soon/)).toBeInTheDocument();
});

test("collection detail route renders", () => {
  renderAt("/collections/1");
  expect(screen.getByText(/CollectionDetail — coming soon/)).toBeInTheDocument();
});
