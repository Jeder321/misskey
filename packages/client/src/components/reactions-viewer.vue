<template>
<div ref="targetEl" class="tdflqwzn" :class="{ isMe }">
	<XReaction v-for="(count, reaction) in note.reactions" :key="reaction" :reaction="reaction" :count="count" :is-initial="initialReactions.has(reaction)" :users="usersMap[reaction]" :note="note"/>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import * as foundkey from 'foundkey-js';
import { $i } from '@/account';
import * as os from '@/os';
import XReaction from './reactions-viewer.reaction.vue';
import { useIntersectionObserver } from '@vueuse/core';

const props = defineProps<{
	note: foundkey.entities.Note;
}>();

const initialReactions = new Set(Object.keys(props.note.reactions));

const isMe = computed(() => $i && $i.id === props.note.userId);

const usersMap = ref({});
const superloaded = ref(false);
const targetEl = ref();

async function updateReactions(currentValue) {
	const reactions = await os.api('notes/reactions', {
		noteId: currentValue.id,
		limit: 100,
	});
	const users = {};
	for (const reaction of reactions) {
		if (users[reaction.type] === undefined) {
			users[reaction.type] = [];
		}
		users[reaction.type].push(reaction.user);
	}
	usersMap.value = users;
	superloaded.value = true;
}

async function prepareFetch(note) {
	superloaded.value = false;
	const { stop } = useIntersectionObserver(targetEl, ([{ isIntersecting}]) => {
		if (isIntersecting) {
			superloaded.value = true;
			stop();
			updateReactions(note);
		}
	});
}
onMounted(() => prepareFetch(props.note));
watch(props.note, prepareFetch, { deep: true });
</script>

<style lang="scss" scoped>
.tdflqwzn {
	margin: 4px -2px 0 -2px;

	&:empty {
		display: none;
	}

	&.isMe {
		> span {
			cursor: default !important;
		}
	}
}
</style>
