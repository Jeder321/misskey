<template>
<a :href="to" :class="active ? activeClass : null" @click.prevent="nav">
	<slot></slot>
</a>
</template>

<script lang="ts" setup>
import * as os from '@/os';
import copyToClipboard from '@/scripts/copy-to-clipboard';
import { url } from '@/config';
import { i18n } from '@/i18n';
import { useRouter } from '@/router';

const props = withDefaults(defineProps<{
	to: string;
	activeClass?: null | string;
	behavior?: null | 'window' | 'browser' | 'modalWindow';
}>(), {
	activeClass: null,
	behavior: null,
});

const router = useRouter();

const active = $computed(() => {
	if (props.activeClass == null) return false;
	const resolved = router.resolve(props.to);
	if (resolved == null) return false;
	if (resolved.route.path === router.currentRoute.value.path) return true;
	if (resolved.route.name == null) return false;
	if (router.currentRoute.value.name == null) return false;
	return resolved.route.name === router.currentRoute.value.name;
});

function openWindow() {
	os.pageWindow(props.to);
}

function modalWindow() {
	os.modalPageWindow(props.to);
}

function popout() {
	popout_(props.to);
}

function nav() {
	if (props.behavior === 'browser') {
		location.href = props.to;
	} else if (props.behavior === 'window') {
		os.pageWindow(props.to);
	} else if (props.behavior === 'modalWindow') {
		os.modalPageWindow(props.to);
	} else {
		router.push(props.to);
	}
}
</script>
