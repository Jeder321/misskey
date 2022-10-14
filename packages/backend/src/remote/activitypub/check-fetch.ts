import config from '@/config/index.js';
import { IncomingMessage } from 'http';
import { fetchMeta } from '@/misc/fetch-meta.js';
import httpSignature from '@peertube/http-signature';
import { URL } from 'url';
import { toPuny } from '@/misc/convert-host.js';
import DbResolver from '@/remote/activitypub/db-resolver.js';
import { getApId } from '@/remote/activitypub/type.js';

export default async function checkFetch(req: IncomingMessage): Promise<number> {
	const meta = await fetchMeta();
	if (meta.secureMode || meta.privateMode) {
		let signature;

		try {
			signature = httpSignature.parseRequest(req, { 'headers': [] });
		} catch (e) {
			return 401;
		}

		const keyId = new URL(signature.keyId);
		const host = toPuny(keyId.hostname);

		if (meta.blockedHosts.includes(host)) {
			return 403;
		}

		if (meta.privateMode && host !== config.host && !meta.allowedHosts.includes(host)) {
			return 403;
		}

		const keyIdLower = signature.keyId.toLowerCase();
		if (keyIdLower.startsWith('acct:')) {
			// Old keyId is no longer supported.
			return 401;
		}

		const dbResolver = new DbResolver();

		// Get user from database based on HTTP-Signature keyId
		let authUser = await dbResolver.getAuthUserFromKeyId(signature.keyId);

		// If keyid is unknown, try resolving it
		if (authUser == null) {
			try {
				keyId.hash = '';
				authUser = await dbResolver.getAuthUserFromApId(getApId(keyId.toString()));
			} catch (e) {
				return 403;
			}
		}

		if (authUser?.key == null) {
			return 403;
		}

		if (authUser.user.host !== host) {
			return 403;
		}

		// HTTP-Signature validation
		const httpSignatureValidated = httpSignature.verifySignature(signature, authUser.key.keyPem);

		if (!httpSignatureValidated) {
			return 403;
		}
	}
	return 200;
}
