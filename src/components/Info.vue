<template>
    <n-h1>欢迎！</n-h1>
    <n-popover trigger="hover" placement="bottom-start">
        <template #trigger>
            <n-h2>这是一个简易MarkDown渲染器</n-h2>
        </template>
        <n-p>根本不会编译原理和Web只会便乘组件的作者事屑</n-p>
        <n-p>我自裁罢（绝望</n-p>
    </n-popover>
    <n-h3>编辑完成后可使用浏览器的打印功能导出pdf</n-h3>
</template>

<script>
import { NH1, NH2, NH3, NP, NPopover } from "naive-ui";
export default {
    name: "Info",
    components: {
        NH1,
        NH2,
        NH3,
        NP,
        NPopover,
    },
};
</script>
