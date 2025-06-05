/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import InfiniteScroll from "react-infinite-scroll-component";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { APP_PATHS } from "@/config/path.config";
import { UserRole } from "@prisma/client";
import { LoadingSpinner } from "../zakaat-applications/_component/loading-spinner";
import { Tweet } from "../_components/tweet";
import TweetForm from "./_components/tweet-form";
import { useEffect } from "react";

const DonorTweetsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user.role !== UserRole.DONOR) {
      if (session?.user.role === UserRole.APPLICANT)
        router.push(APP_PATHS.APPLICANT_DASHBOARD_MESSAGES);
      else if (session?.user.role === UserRole.VERIFIER)
        router.push(APP_PATHS.VERIFIER_DASHBOARD_SEARCH_APPLICANT);
      else router.push(APP_PATHS.HOME);
    }
  }, [status]);

  const tweets = api.tweet.infiniteTweetsScrollFeed.useInfiniteQuery(
    { onlyFollowing: false, limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  if (tweets.isLoading) return <LoadingSpinner />;
  if (tweets.isError) return <div>Error</div>;

  const rawTweets = tweets.data?.pages.flatMap((page) => page.tweets);

  if (!rawTweets || rawTweets.length === 0) return <h2>No tweets</h2>;

  return (
    <div className="mb-5 flex flex-col gap-y-5">
      <TweetForm />
      <InfiniteScroll
        dataLength={rawTweets.length}
        next={tweets.fetchNextPage}
        hasMore={tweets.hasNextPage}
        loader={<LoadingSpinner />}
        className="flex flex-col gap-y-5 px-2 sm:px-4"
      >
        {rawTweets.map((tweet) => (
          <Tweet
            key={tweet.id}
            name={tweet.author.name}
            email={tweet.author.email}
            time={tweet.createdAt}
            content={tweet.text}
            dp={tweet.author.image}
          />
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default DonorTweetsPage;
