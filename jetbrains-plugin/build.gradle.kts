plugins {
    id("java")
    id("org.jetbrains.intellij") version "1.15.0"
    id("org.jetbrains.kotlin.jvm") version "1.8.20"
}

group = "com.qoocode"
version = "0.1.30"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.8.20")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
}

intellij {
    pluginName.set("qoocode")
    version.set("2023.1.2")
    type.set("IC")
    
    plugins.set(listOf(
        "com.intellij.java",
        "com.intellij.platform.core"
    ))
}

tasks {
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }
    
    patchPluginXml {
        version.set(project.version.toString())
        sinceBuild.set("231")
        untilBuild.set("242")
    }
    
    buildSearchableOptions {
        enabled = false
    }
    
    runIde {
        maxHeapSize.set("2g")
    }
    
    wrapper {
        gradleVersion.set("8.4")
    }
}

kotlin {
    jvmToolchain(17)
}
