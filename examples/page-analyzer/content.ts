import { onMessage } from "@theluckystrike/webext-messaging";

type ContentMessages = {
  analyzePage: {
    request: void;
    response: {
      url: string;
      title: string;
      headingCount: number;
      wordCount: number;
      linkCount: number;
    };
  };
};

onMessage<ContentMessages>({
  async analyzePage() {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const links = document.querySelectorAll("a[href]");
    const text = document.body.innerText || "";
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    return {
      url: location.href,
      title: document.title,
      headingCount: headings.length,
      wordCount: words.length,
      linkCount: links.length,
    };
  },
});
