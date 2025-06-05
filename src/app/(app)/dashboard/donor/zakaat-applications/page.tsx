/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import InfiniteScroll from "react-infinite-scroll-component";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { LoadingSpinner } from "./_component/loading-spinner";
import { ZakaatApplication } from "../../_components/zakaat-application";
import { useSession } from "next-auth/react";
import { APP_PATHS } from "@/config/path.config";
import { UserRole } from "@prisma/client";
import { useEffect } from "react";

const DonorGenuineApplicationsPage = () => {
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

  const searchParams = useSearchParams();
  const longitude = searchParams.get("longitude") ?? "";
  const latitude = searchParams.get("latitude") ?? "";

  const applications =
    api.application.infiniteApplicationsScrollFeed.useInfiniteQuery(
      { latitude, longitude },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    );

  if (applications.isLoading) return <LoadingSpinner />;
  if (applications.isError) return <div>Error</div>;

  const rawApplications = applications.data?.pages.flatMap(
    (page) => page.applications,
  );

  if (!rawApplications || rawApplications.length === 0)
    return <h2>No tweets</h2>;

  return (
    <InfiniteScroll
      dataLength={rawApplications.length}
      next={applications.fetchNextPage}
      hasMore={applications.hasNextPage}
      loader={<LoadingSpinner />}
      className="mb-5 flex flex-col gap-y-5 px-4"
    >
      {rawApplications.map((application) => (
        <ZakaatApplication
          key={application.id}
          upiId={application.author.upiId}
          reason={application.reason}
          name={application.verifier.name}
          amount={application.amount}
          rank={application.rating}
          selfie={application.author.selfie}
          verifierImage={application.verifier.image}
          isItBookmark={false}
          applicationId={application.id}
          applicantName={application.author.name}
          applicantId={application.author.id}
        />
      ))}
    </InfiniteScroll>
  );
};

export default DonorGenuineApplicationsPage;
