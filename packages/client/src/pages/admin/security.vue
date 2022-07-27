<template>
<MkStickyContainer>
	<template #header><XHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
		<FormSuspense :p="init">
			<div class="_formRoot">
				<FormFolder class="_formBlock">
					<template #icon><i class="fas fa-shield-alt"></i></template>
					<template #label>{{ i18n.ts.botProtection }}</template>
					<template v-if="enableHcaptcha" #suffix>hCaptcha</template>
					<template v-else-if="enableRecaptcha" #suffix>reCAPTCHA</template>
					<template v-else #suffix>{{ i18n.ts.none }} ({{ i18n.ts.notRecommended }})</template>

					<XBotProtection/>
				</FormFolder>

				<FormFolder class="_formBlock">
					<template #label>Summaly Proxy</template>

					<div class="_formRoot">
						<FormInput v-model="summalyProxy" class="_formBlock">
							<template #prefix><i class="fas fa-link"></i></template>
							<template #label>Summaly Proxy URL</template>
						</FormInput>

						<FormButton primary class="_formBlock" @click="save"><i class="fas fa-save"></i> {{ i18n.ts.save }}</FormButton>
					</div>
				</FormFolder>

				<FormFolder class="_formBlock">
					<template #label>{{ i18n.ts.instanceSecurity }}</template>

					<div class="_formRoot">
						<FormSwitch v-if="!privateMode" v-model="secureMode">
							<template #label>{{ i18n.ts.secureMode }}</template>
							<template #caption>{{ i18n.ts.secureModeInfo }}</template>
						</FormSwitch>
						<FormSwitch v-model="privateMode">
							<template #label>{{ i18n.ts.privateMode }}</template>
							<template #caption>{{ i18n.ts.privateModeInfo }}</template>
						</FormSwitch>
						<FormTextarea v-if="privateMode" v-model="allowedHosts">
							<template #label>{{ i18n.ts.allowedInstances }}</template>
							<template #caption>{{ i18n.ts.allowedInstancesDescription }}</template>
						</FormTextarea>
						<FormButton primary class="_formBlock" @click="saveInstance"><i class="fas fa-save"></i> {{ i18n.ts.save }}</FormButton>
					</div>
				</FormFolder>
			</div>
		</FormSuspense>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { } from 'vue';
import XBotProtection from './bot-protection.vue';
import XHeader from './_header_.vue';
import FormFolder from '@/components/form/folder.vue';
import FormSwitch from '@/components/form/switch.vue';
import FormInfo from '@/components/ui/info.vue';
import FormSuspense from '@/components/form/suspense.vue';
import FormSection from '@/components/form/section.vue';
import FormInput from '@/components/form/input.vue';
import FormButton from '@/components/ui/button.vue';
import FormTextarea from '@/components/form/textarea.vue';
import * as os from '@/os';
import { fetchInstance } from '@/instance';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

let summalyProxy: string = $ref('');
let enableHcaptcha: boolean = $ref(false);
let enableRecaptcha: boolean = $ref(false);

let secureMode: boolean = $ref(false);
let privateMode: boolean = $ref(false);
let allowedHosts: string = $ref('');

async function init() {
	const meta = await os.api('admin/meta');
	summalyProxy = meta.summalyProxy;
	enableHcaptcha = meta.enableHcaptcha;
	enableRecaptcha = meta.enableRecaptcha;
	secureMode = meta.secureMode;
	privateMode = meta.privateMode;
	allowedHosts = meta.allowedHosts.join('\n');
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		summalyProxy,
	}).then(() => {
		fetchInstance();
	});
}

function saveInstance() {
	os.apiWithDialog('admin/update-meta', {
		secureMode,
		privateMode,
		allowedHosts: allowedHosts.split('\n'),
	}).then(() => {
		fetchInstance();
	});
}

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata({
	title: i18n.ts.security,
	icon: 'fas fa-lock',
});
</script>
