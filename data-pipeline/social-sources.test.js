import { describe, it, expect } from "vitest";

// Test the HTML parsing logic used by getTelegramPosts and getFxpThreads
// These test the regex patterns without making real HTTP requests

describe("Telegram HTML parsing", () => {
  const sampleHtml = `
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="KanNewss/1234">
        <div class="tgme_widget_message_bubble">
          <div class="tgme_widget_message_text js-message_text" dir="auto">
            ראש הממשלה נתניהו נפגש עם שר הביטחון
          </div>
          <div class="tgme_widget_message_footer">info</div>
        </div>
      </div>
    </div>
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="KanNewss/1235">
        <div class="tgme_widget_message_bubble">
          <div class="tgme_widget_message_text js-message_text" dir="auto">
            הכנסת אישרה את חוק התקציב ברוב של 61 חברי כנסת
          </div>
          <div class="tgme_widget_message_footer">info</div>
        </div>
      </div>
    </div>
  `;

  it("extracts message text and IDs from Telegram HTML", () => {
    const messageRegex =
      /data-post="[^/]+\/(\d+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<a|<div class="tgme_widget_message)/g;
    const posts = [];
    let match;
    while ((match = messageRegex.exec(sampleHtml)) !== null) {
      posts.push({
        msgId: match[1],
        text: match[2].replace(/<[^>]+>/g, "").trim(),
      });
    }

    expect(posts.length).toBe(2);
    expect(posts[0].msgId).toBe("1234");
    expect(posts[0].text).toContain("נתניהו");
    expect(posts[1].msgId).toBe("1235");
    expect(posts[1].text).toContain("כנסת");
  });

  it("handles empty channel page gracefully", () => {
    const emptyHtml = '<div class="tgme_page">No messages</div>';
    const messageRegex =
      /data-post="[^/]+\/(\d+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<a|<div class="tgme_widget_message)/g;
    const posts = [];
    let match;
    while ((match = messageRegex.exec(emptyHtml)) !== null) {
      posts.push(match);
    }
    expect(posts.length).toBe(0);
  });
});

describe("FXP HTML parsing", () => {
  const sampleHtml = `
    <div class="threadbit">
      <a href="showthread.php?t=12345">ביבי נגד לפיד - מי צודק?</a>
    </div>
    <div class="threadbit">
      <a href="showthread.php?t=12346&page=2">הצבעת אי אמון בכנסת</a>
    </div>
    <div class="threadbit">
      <a href="showthread.php?t=12345">ביבי נגד לפיד - מי צודק?</a>
    </div>
  `;

  it("extracts thread IDs and titles", () => {
    const threadRegex = /showthread\.php\?t=(\d+)[^"]*"[^>]*>([^<]+)/g;
    const threads = [];
    const seen = new Set();
    let match;
    while ((match = threadRegex.exec(sampleHtml)) !== null) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      threads.push({ id: match[1], title: match[2].trim() });
    }

    expect(threads.length).toBe(2);
    expect(threads[0].id).toBe("12345");
    expect(threads[0].title).toContain("ביבי");
    expect(threads[1].id).toBe("12346");
  });

  it("deduplicates threads by ID", () => {
    const threadRegex = /showthread\.php\?t=(\d+)[^"]*"[^>]*>([^<]+)/g;
    const seen = new Set();
    let count = 0;
    let match;
    while ((match = threadRegex.exec(sampleHtml)) !== null) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        count++;
      }
    }
    // 3 matches in HTML but only 2 unique IDs
    expect(count).toBe(2);
  });
});

describe("Bluesky response parsing", () => {
  it("extracts posts from AT Protocol response shape", () => {
    const response = {
      posts: [
        {
          author: { handle: "user.bsky.social" },
          record: { text: "נתניהו הודיע על הסכם", createdAt: "2026-03-22T10:00:00Z" },
          uri: "at://did:plc:abc/app.bsky.feed.post/xyz123",
        },
      ],
    };

    const posts = (response.posts ?? []).map((post) => ({
      author: post.author?.handle || "unknown",
      body: post.record?.text || "",
      permalink: `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split("/").pop()}`,
    }));

    expect(posts.length).toBe(1);
    expect(posts[0].author).toBe("user.bsky.social");
    expect(posts[0].body).toContain("נתניהו");
    expect(posts[0].permalink).toContain("xyz123");
  });

  it("handles empty response", () => {
    const posts = (undefined ?? []).map((p) => p);
    expect(posts.length).toBe(0);
  });
});
