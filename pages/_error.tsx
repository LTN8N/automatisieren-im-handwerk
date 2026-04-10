import { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <p>
      {statusCode
        ? `Ein Fehler ${statusCode} ist aufgetreten.`
        : "Ein unbekannter Fehler ist aufgetreten."}
    </p>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
