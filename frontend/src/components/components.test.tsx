import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Avatar from "./Avatar";
import CollectionCard from "./CollectionCard";
import PhotoCell from "./PhotoCell";
import TagPill from "./TagPill";

describe("TagPill", () => {
  test("renders label and count, fires onClick", async () => {
    const onClick = vi.fn();
    render(<TagPill label="christmas" count={7} onClick={onClick} />);
    const pill = screen.getByRole("button");
    expect(pill).toHaveTextContent("christmas");
    expect(pill).toHaveTextContent("7");
    await userEvent.click(pill);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("active state uses the accent token", () => {
    render(<TagPill label="red" active />);
    expect(screen.getByRole("button")).toHaveStyle({ background: "var(--accent)" });
  });

  test("omits the count when not provided", () => {
    render(<TagPill label="red" />);
    expect(screen.getByRole("button").textContent).toBe("red");
  });
});

describe("PhotoCell", () => {
  test("renders the image when a url exists", () => {
    render(<PhotoCell imageUrl="https://img.example/a.jpg" name="Joe Cool" />);
    expect(screen.getByRole("img", { name: "Joe Cool" })).toHaveAttribute(
      "src",
      "https://img.example/a.jpg",
    );
    expect(screen.getByText("Joe Cool")).toBeInTheDocument();
  });

  test("falls back to the camera tile without an image", () => {
    render(<PhotoCell imageUrl={null} name="Mystery Mug" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Mystery Mug")).toBeInTheDocument();
  });
});

describe("CollectionCard", () => {
  test("shows name, count, updated label, and thumbnails", () => {
    render(
      <CollectionCard
        name="Snoopy Mugs"
        itemCount={24}
        updatedLabel="2d ago"
        imageUrls={["https://img.example/1.jpg", "https://img.example/2.jpg"]}
      />,
    );
    expect(screen.getByText("Snoopy Mugs")).toBeInTheDocument();
    expect(screen.getByText(/24 items · 2d ago/)).toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(2);
  });

  test("singular item count", () => {
    render(<CollectionCard name="A" itemCount={1} updatedLabel="now" imageUrls={[]} />);
    expect(screen.getByText(/1 item · now/)).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  test("renders initials", () => {
    render(<Avatar initials="MK" />);
    expect(screen.getByText("MK")).toBeInTheDocument();
  });
});
