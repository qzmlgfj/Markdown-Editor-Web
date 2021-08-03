<template>
    <n-h1>欢迎！</n-h1>
    <n-h2>这是一个简易MarkDown渲染器</n-h2>
    <n-h3>编辑完成后可使用浏览器的打印功能导出pdf</n-h3>
</template>

<script>
import { NH1, NH2, NH3 } from "naive-ui";
export default {
    name: "Info",
    components: {
        NH1,
        NH2,
        NH3,
    },
};
</script>
