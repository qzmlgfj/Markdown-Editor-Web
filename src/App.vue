<template>
    <n-card :bordered="false">
        <div id="info">
            <info />
        </div>
        <editor />
        <template #footer> <footage /> </template>
    </n-card>
</template>

<script>
import Editor from "./components/Editor.vue";
import Info from "./components/Info.vue";
import Footage from "./components/Footage.vue";
import { NCard } from "naive-ui";

export default {
    name: "App",
    components: {
        Editor,
        Info,
        NCard,
        Footage,
    },
};
</script>

<style>
@media print {
    .md-input-wrapper,
    .md-toolbar {
        display: none;
    }

    .md {
        border: 0;
        height: unset;
    }

    .n-card__footer {
        display: none;
    }

    #info{
        display: none;
    }
}
</style>
