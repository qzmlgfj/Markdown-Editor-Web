<template>
    <n-divider />
    <n-popover trigger="hover" placement="top">
        <template #trigger>
            <n-p>{{ info }}</n-p>
        </template>
        <n-p>根本不会编译原理和Web只会便乘组件的作者事屑</n-p>
        <n-p>我自裁罢（绝望</n-p>
    </n-popover>
</template>

<script>
import { NDivider, NP, NPopover } from "naive-ui";
export default {
    name: "Footage",
    components: {
        NDivider,
        NP,
        NPopover,
    },
    data() {
        return {
            info: "Designed by Ant",
        };
    },
};
</script>

<style scoped>
.n-p {
    text-align: center;
}
</style>
