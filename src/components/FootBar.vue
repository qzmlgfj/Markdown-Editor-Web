<template>
    <div class="foot-bar">
        <n-text depth="3">Markdown Editor · Made by Ant</n-text>
    </div>
</template>

<script>
import { NText } from "naive-ui";

export default {
    name: 'FooterBar',
    components: {
        NText
    }
};
</script>

<style scoped>
.foot-bar {
    display: flex;
    box-sizing: border-box;
    height: 100%;
    align-items: center;
    justify-content: center;
    padding: 0 2vw;
}
</style>
