// noinspection HtmlRequiredTitleElement

import { cookieStorageManagerSSR } from "@chakra-ui/color-mode";
import { Center, Heading } from "@chakra-ui/layout";
import { useColorModePreference } from "@chakra-ui/media-query";
import { ChakraProvider } from "@chakra-ui/provider";
import { chakra } from "@chakra-ui/system";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError
} from "@remix-run/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import Layout from "~/components/layout/layout";
import { useNProgress } from "~/hooks";
import { getT } from "~/i18next.server";
import theme from "~/theme";

export async function loader({ request }: LoaderFunctionArgs) {
  const { t, locale } = await getT(request);

  return json({
    time: Date.now(),
    cookies: request.headers.get("Cookie") ?? "",
    locale,
    title: t("title")
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.title }
];

const COLOR_MODE_KEY = "chakra-ui-color-mode";

export function getKeyFromCookies(
  cookies: string | undefined | null,
  key: string
) {
  return cookies?.match(new RegExp(`(^| )${key}=([^;]+)`))?.at(2);
}

function Document({
  children,
  title
}: {
  children: ReactNode;
  title?: string;
}) {
  useNProgress();

  const loaderData = useLoaderData<typeof loader>();
  const defaultColorMode = useColorModePreference() ?? "light";

  let cookies = loaderData?.cookies;

  if (typeof document !== "undefined") {
    cookies = document.cookie;
  }

  let colorMode = useMemo(() => {
    let color = getKeyFromCookies(cookies, COLOR_MODE_KEY);

    if (!color) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cookies += ` ${COLOR_MODE_KEY}=${defaultColorMode}`;
      color = defaultColorMode;
    }

    return color;
  }, [cookies]);

  const locale = loaderData?.locale ?? "en";
  const { i18n } = useTranslation();

  return (
    <chakra.html
      lang={locale}
      h="100%"
      dir={i18n.dir()}
      {...(colorMode && {
        "data-theme": colorMode,
        style: { colorScheme: colorMode }
      })}
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {title && <title>{title}</title>}
        <Meta />
        <Links />
      </head>
      <chakra.body
        h="100%"
        {...(colorMode && { className: `chakra-ui-${colorMode}` })}
      >
        <ChakraProvider
          colorModeManager={cookieStorageManagerSSR(cookies)}
          theme={theme}
        >
          {children}
        </ChakraProvider>
        <ScrollRestoration />
        <Scripts />
      </chakra.body>
    </chakra.html>
  );
}

function RouteErrorWrapper({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <Document title={t("errors.title")}>
      <Layout>
        <Center flexDir="column" w="100%">
          {children}
        </Center>
      </Layout>
    </Document>
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as any;

  if (isRouteErrorResponse(error)) {
    return (
      <RouteErrorWrapper>
        <Heading>
          {error.status} {error.statusText}
        </Heading>
        {error.data}
      </RouteErrorWrapper>
    );
  }

  return (
    <RouteErrorWrapper>
      <Heading>{error.message ?? "Unknown Error"}</Heading>
    </RouteErrorWrapper>
  );
}

export default function App() {
  return (
    <Document>
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  );
}
