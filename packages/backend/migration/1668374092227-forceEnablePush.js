import push from 'web-push';

export class forceEnablePush1668374092227 {
	name = 'forceEnablePush1668374092227';

	async up(queryRunner) {
		// generate VAPID keys if not yet set
		const keysSet = await queryRunner.query(`SELECT "swPublicKey" IS NOT NULL AND "swPrivateKey" IS NOT NULL as set FROM "meta"`);
		// if there is no meta entry yet, the keys will be generated on initial setup
		if (keysSet.length > 0 && !keysSet.set) {
			// VAPID keys are not set yet, so set them
			const { publicKey, privateKey } = push.generateVAPIDKeys();
			await queryRunner.query(`UPDATE "meta" SET "swPublicKey" = $1, "swPrivateKey" = $2`, [publicKey, privateKey]);
		}

		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableServiceWorker"`);
		await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "swPublicKey" SET NOT NULL`);
		await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "swPrivateKey" SET NOT NULL`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "swPrivateKey" DROP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "swPublicKey" DROP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableServiceWorker" boolean NOT NULL DEFAULT false`);
		// since VAPID keys are set and the service worker may have been enabled before, make sure it is now enabled
		await queryRunner.query(`UPDATE "meta" SET "enableServiceWorker" = true`);
		// can't unset the VAPID keys because we do not know if we set them in the migration
	}
}
