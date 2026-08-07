import { useState } from 'react';
import { useModalDialog } from '../lib/use-modal-dialog';
import { useModalHistoryDismiss } from '../lib/use-modal-history-dismiss';
import { Button } from './components';

export function CreatorAccountMenu({
  identity,
  onSignOut,
  signingOut,
}: {
  identity: string;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeAccount = () => setOpen(false);
  const dismissAccount = useModalHistoryDismiss({
    active: open,
    blocked: signingOut,
    onDismiss: closeAccount,
    stateKey: 'digistreamCreatorAccount',
  });
  const dialogRef = useModalDialog<HTMLElement>(open, dismissAccount);

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="ds-account-trigger"
        icon="user"
        onClick={() => setOpen(true)}
        variant="ghost"
      >
        Account
      </Button>

      {open ? (
        <div className="ds-account-backdrop" role="presentation">
          <section
            aria-label="Account"
            aria-modal="true"
            className="ds-account-dialog"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="ds-account-dialog-heading">
              <div>
                <span>Account</span>
                <h2>Signed-in account</h2>
              </div>
              <Button
                aria-label="Close account"
                disabled={signingOut}
                onClick={dismissAccount}
                variant="ghost"
              >
                Close
              </Button>
            </div>

            <div className="ds-account-dialog-identity" aria-label="Signed-in identity">
              <span>Signed in as</span>
              <strong>{identity}</strong>
            </div>

            <Button
              data-dialog-initial-focus
              fullWidth
              loading={signingOut}
              onClick={() => void onSignOut()}
              variant="danger"
            >
              Sign out
            </Button>
          </section>
        </div>
      ) : null}
    </>
  );
}
