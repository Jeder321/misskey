<template>
<component
	:is="popup.component"
	v-for="popup in popups"
	:key="popup.id"
	v-bind="popup.props"
	v-on="popup.events"
/>

<XUpload v-if="uploads.length > 0"/>

<XStreamIndicator/>

<div v-if="pendingApiRequestsCount > 0" id="wait"></div>

<div v-if="dev" id="devTicker"><span>DEV BUILD</span></div>
</template>

<script lang="ts" setup>
import * as foundkey from 'foundkey-js';
import { defineAsyncComponent, Ref, ref } from 'vue';
import { swInject } from './sw-inject';
import { popup as showPopup, popups, pendingApiRequestsCount } from '@/os';
import { uploads } from '@/scripts/upload';
import * as sound from '@/scripts/sound';
import { $i } from '@/account';
import { stream } from '@/stream';
import { instance } from '@/instance';
import { getNoteSummary } from '@/scripts/get-note-summary';
import { acct } from '@/filters/user';

const XStreamIndicator = defineAsyncComponent(() => import('./stream-indicator.vue'));
const XUpload = defineAsyncComponent(() => import('./upload.vue'));
const dev: Ref<boolean> = ref(_DEV_);

const onNotification = (notification: foundkey.entities.Notification): void => {
	if ($i?.mutingNotificationTypes.includes(notification.type)) return;

	if (document.visibilityState === 'visible') {
		stream.send('readNotification', {
			id: notification.id,
		});

		if (notification.type !== 'app') {
			const user = notification.user;
			const userName = acct(user);
			let title: string;
			let body = 'note' in notification ? getNoteSummary(notification.note) : undefined;
			switch (notification.type) {
				case 'pollEnded':
					title = `${userName}'s poll has ended`;
					break;
				case 'follow':
					title = `${userName} followed you`;
					break;
				case 'followRequestAccepted':
					title = `${userName} accepted your follow request`;
					break;
				case 'mention':
					title = `${userName} mentioned you`;
					break;
				case 'pollVote':
					title = `${userName} voted in your poll`;
					break;
				case 'quote':
					title = `${userName} quoted your post`;
					break;
				case 'reaction':
					title = `${userName} ${notification.reaction}ed your post`;
					break;
				case 'receiveFollowRequest':
					title = `${userName} sent you a follow request`;
					break;
				case 'renote':
					title = `${userName} renoted your post`;
					break;
				case 'reply':
					title = `${userName} replied to your post`;
					break;
				case 'groupInvited':
					title = `${userName} invited you to a group`;
					break;
			}

			console.log(user, userName, title, body);
			new Notification(title, {
				body,
				image: user.avatarUrl,
				icon: instance.iconUrl,
				// TODO: timestamp?
			});
		}
	}

	sound.play('notification');
};

if ($i) {
	const connection = stream.useChannel('main', null, 'UI');
	connection.on('notification', onNotification);
	Notification.requestPermission();

	//#region Listen message from SW
	if ('serviceWorker' in navigator) {
		swInject();
	}
}
</script>

<style lang="scss">
@keyframes dev-ticker-blink {
	0% { opacity: 1; }
	50% { opacity: 0; }
	100% { opacity: 1; }
}

@keyframes progress-spinner {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

#wait {
	display: block;
	position: fixed;
	z-index: 4000000;
	top: 15px;
	right: 15px;

	&:before {
		content: "";
		display: block;
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		border: solid 2px transparent;
		border-top-color: var(--accent);
		border-left-color: var(--accent);
		border-radius: 50%;
		animation: progress-spinner 400ms linear infinite;
	}
}

#devTicker {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 2147483647;
	color: #ff0;
	background: rgba(0, 0, 0, 0.5);
	padding: 4px 5px;
	font-size: 14px;
	pointer-events: none;
	user-select: none;

	> span {
		animation: dev-ticker-blink 2s infinite;
	}
}
</style>
