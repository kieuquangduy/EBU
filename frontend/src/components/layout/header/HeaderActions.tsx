import { Link } from "react-router-dom";
import NotificationBell from "../../notification/NotificationBell";
import { ROUTES } from "../../../lib/routes";
import { HeartIcon, QuoteIcon } from "./HeaderIcons";

type HeaderActionsProps = {
  iconButtonClass: string;
};

export default function HeaderActions({ iconButtonClass }: HeaderActionsProps) {
  return (
    <>
      <NotificationBell buttonClassName={iconButtonClass} />

      <Link to={ROUTES.WISHLIST} className={iconButtonClass} aria-label="Yêu thích">
        <HeartIcon />
      </Link>

      <Link
        to={ROUTES.QUOTES}
        className={iconButtonClass}
        aria-label="Yêu cầu báo giá"
        title="Yêu cầu báo giá"
      >
        <QuoteIcon />
      </Link>
    </>
  );
}
